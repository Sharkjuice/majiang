define(['../common/mjconst.js','../common/mjtable.js', '../common/mjutils.js', './mjpaizhuo.js', 
'./mjpaiyou.js', './mjdice.js', './mjgraph.js','../common/connection_ws.js','./mjtalk.js',
'./mjvoice.js'], 
function (mjconst,mjtable, mjutils, mjpaizhuo, mjpaiyou, mjdice, mjgraph,conn, mjtalk, mjvoice) {
    let left_button_pos = {left:0, top:0}
    let right_buttons_pos ={right:0, bottom:0}
    let action_button_gap  = -1

    //全局变量, 减少冗余代码
    let context = {}
    let I_am_on_the_table = false

    function init(){
        let scale = mjgraph.getFactors().scale
        let ps1 = mjgraph.getPaiSize1()
        let ps2 = mjgraph.getPaiSize2()
        right_buttons_pos.right = (1.5*ps2.height + 20)*scale
        right_buttons_pos.bottom = (1.5*ps1.height + 20)*scale
        left_button_pos.left = 30*scale
        left_button_pos.top = 30*scale
        action_button_gap = 2.5*ps2.width*scale
    }

    function closeTable(reason){
        console.log("closeTable", reason)
        mjutils.Tips.show(reason)            
        mjpaizhuo.hideTextFang()
        $("#button_table").text('牌桌')
        $("#button_switch").text("自动")
        EventHandler.close()
        if(context.table){
            context.table.laizi.hide()
            context.table.close() 
        }
        mjvoice.getOtherVoice(10).play() 
        context = {}
        I_am_on_the_table = false
    } 

    function initWebSocket(room_id, client_id, then){
        //connecting to our signaling server
        let conn_client = conn.getConnection(client_id)
        conn.ConnRemote.clientSyncHandler(then)
        if(conn_client && conn_client.status != conn.CONN_SHUTDOWN){
            console.log("initWebSocket, reconnect")
            conn_client.reconnect()
        }else{
            conn.ConnRemote.newConnection(conn.CONN_CLIENT_PEER, client_id, 
                `wss://${document.location.host}/majiang/room/${room_id}/ws`)
            let rtc = mjtalk.handlers
            Object.keys(mjtalk.handlers).forEach( key =>{
                conn.ConnRemote.setEventHandler(key, mjtalk.handlers[key])
            })
            conn.ConnRemote.setEventHandler(mjconst.ET_JOIN, joinHandler)
            conn.ConnRemote.setEventHandler(mjconst.ET_LOGIN, loginHandler)
            conn.ConnRemote.setEventHandler(mjconst.ET_NIOJ, niojHandler)      
            conn.ConnRemote.setDefaultHandler(defaultHandler)
        }
    }

    function joinHandler(msg){
        niojHandler(msg)
        context.I.send(mjconst.EA_SYSTEM, mjconst.ET_NIOJ, msg.source)
    }
    
    function loginHandler(msg){
        let player_info = msg.body[0]
        let table_info = msg.body[1]
        if(player_info.fang < 0){
            mjutils.Tips.show(table_info.msg)
            return
        }
        table = mjtable.Table.get(msg.table_id)
        if(!table){
            table = mjtable.Table.create(msg.table_id, msg.client_id, table_info)
        } 
        context.table = table     
        
        table.setPlayers(mjpaiyou.createPlayers(table))
        table.connection = conn.getConnection(msg.client_id)
        table.rotatePlayers(msg.source)

        niojHandler(msg)

        mjtable.Table.setDefault(msg.table_id)
        mjpaizhuo.placeTextFang(msg.source)

        mjpaizhuo.hilightTextFang(table.getPlayerByFang(0).wei)
        if(!player_info.auto_dapai){
            EventHandler.init()
        }
        $("#tab_table").hide()
        $("#button_table").text(table.table_route)
        if(table.dialect.allowInitAction()){
            $("#button_action_after_fapai").text(table.dialect.initActionName())
        }
        context.I = table.getDefaultPlayer()
        I_am_on_the_table = true
    }
    
    function niojHandler(msg){
        //let table = mjtable.get(msg.table_id)
        let paiyou = context.table.join(msg)
        mjpaizhuo.showTextFang(paiyou.fang)
        mjutils.Tips.show(paiyou.name + "坐" + paiyou.fang_name)
    }
    
    function clearTable(){
        mjpaizhuo.hideTextHupai()
        mjpaizhuo.cancelHilightTextFang()
        mjtable.Pot.hideAll()
        $("#button_paishu").text('余牌')
        $("#tab_table").hide()
        hideAllActionButtons()
        mjgraph.rerender()
    }

    function defaultHandler(msg){
        if(!I_am_on_the_table || context.table.table_id != msg.table_id){
            console.log("table is empty or not match...")
            return
        }
        let source = msg.source
        let data = msg.body
        let src_player = (source < 4)?context.table.getPlayerByFang(source):null        
        let pai_index, voice, result
        switch (msg.type){
            case mjconst.ET_JOIN_END:
                mjutils.Tips.show("人到齐了")
                context.table.status = mjconst.PS_FOUR
                if(context.table.isZhuang(context.I)){
                    context.I.send(mjconst.EA_SYSTEM, mjconst.ET_LAIZI)
                }
                break
            case mjconst.ET_LAIZI:
                clearTable()
                if(context.table.dialect.hasLaizi()){
                    context.table.setDiceAndLaizi(data[0],data[1])
                    mjdice.rotate()
                }
                context.I.send(mjconst.EA_SYSTEM, mjconst.ET_LAIZI_END)
                break
            case mjconst.ET_FAPAI:
                data.forEach((pai_list,index) => {
                    let player = context.table.getPlayerByFang(index)
                    player.reset()
                    player.fapai(pai_list)    
                })
                context.I.send(mjconst.EA_SYSTEM, mjconst.ET_FAPAI_END)
                break
            case mjconst.ET_FAPAI_END:
                mjutils.Tips.show("发牌完毕")

                //$("#button_paishu").text(data)
                mjutils.Tips.show(`剩余牌数:${data}`)
                mjpaizhuo.hilightTextFang(src_player.wei)

                //检查有没有特殊处理, 比如豹子,倒中发白
                if(context.table.dialect.allowInitAction()){ 
                    if(context.I.dialect.checkInitAction()){
                        if(context.I.auto_dapai){
                            context.I.beginInitAction(true)
                        }else{
                            //如果是人打牌,显示按钮, 让用户确认
                            selectForInitAction()
                        }
                    }else{
                        context.I.beginInitAction(true)
                    }
                }else{
                    if( context.table.isZhuang(context.I)){
                        context.table.setDapaiQuan(context.I)
                    }                    
                    if(context.I.auto_dapai){
                        if( context.table.isZhuang(context.I)){
                            context.I.selectForAutoDa(true)
                            //等色子转完再打牌
                            if(context.table.dialect.hasLaizi()){
                                setTimeout(beginDapaiAfterPlay, 3000)
                            }else{
                                beginDapaiAfterPlay()
                            }
                        }
                    }
                }
                break
            case mjconst.ET_INIT_ACTION:
                if(src_player.initAction(data)){
                    mjutils.Tips.show(src_player.fang_name + context.table.dialect.initActionName())
                    src_player.show()
                }
                break
            case mjconst.ET_INIT_ACTION_END:
                if( context.table.isZhuang(context.I)){
                    context.table.setDapaiQuan(context.I)
                }
                if(context.I.auto_dapai){
                    if( context.table.isZhuang(context.I)){
                        context.I.selectForAutoDa(true)
                        //等色子转完再打牌
                        if(context.table.dialect.hasLaizi()){
                            setTimeout(beginDapaiAfterPlay, 3000)
                        }else{
                            beginDapaiAfterPlay()
                        }
                    }
                }
                break
            case mjconst.ET_MOPAI:
                mjpaizhuo.hilightTextFang(src_player.wei)
                pai_index = data[0]
                let remain_paishu = data[1]
                //$("#button_paishu").text(remain_paishu)
                mjutils.Tips.show(`剩余牌数:${remain_paishu}`)

                if(pai_index >= 0){
                    src_player.mopai(pai_index)
                    src_player.endMopai()
                }else{
                    mjutils.Tips.show("牌摸完了")
                    context.table.forEachPlayer( player => {
                        if(player != context.I){
                            player.show(true)
                        }
                    })
                    context.table.clearYaopaiQuan()
                    context.table.clearDapaiQuan()
                    context.table.setZhuang(source)
                    context.table.clearDapaiStatistic()
                    
                    if(context.table.isZhuang(context.I)){
                        setTimeout(() => {
                            mjpaizhuo.hilightTextFang(context.I.wei)
                            src_player.send(mjconst.EA_SYSTEM, mjconst.ET_LAIZI)
                            },
                            10000
                        )  
                    }
                }
                break
            case mjconst.ET_MOPAI_END:
                context.table.setDapaiQuan(context.I)
                result = context.I.calcMopai()
    
                //console.log("摸牌分析,杠/胡:", result.can_gang, result.can_hu)
                // if(result.can_gang || result.can_hu){
                //     mjutils.Tips.show("提示:" + (result.can_hu?"可胡":"") + (result.can_gang?"可杠":""))
                // }
                if(!context.I.auto_dapai){
                    if(result.can_gang || result.can_hu){
                        selectForMopai(result.can_hu, result.can_gang)
                    }
                }else
                if(result.can_hu){
                    zimoHupai()
                }else
                if(result.can_gang){
                    zimoGangpai()
                }else{
                    context.I.selectForAutoDa(true)
                    beginDapaiAfterPlay()
                }
                break
            case mjconst.ET_DAPAI:
                src_player.dapai(data)
                let dapai_tuple = context.table.getCurrentDapai()
                result = context.I.calcDapai(dapai_tuple)
                voice = mjvoice.getDapaiVoice(dapai_tuple.pai.facetype)
                
                if(!context.I.auto_dapai){
                    mjvoice.callAfterPlay(voice, selectForDapai, result.can_hu, result.can_gang,
                        result.can_peng, result.can_chi)
                }else{
                    let req_type = mjutils.getReqestType(result.can_hu, result.can_gang,result.can_peng,
                        result.can_chi)
                    mjvoice.callAfterPlay(voice, context.I.send.bind(context.I, mjconst.EA_SYSTEM, req_type))
                }
                break
            case mjconst.ET_CHIPAI:
                mjpaizhuo.hilightTextFang(src_player.wei) 
                voice = mjvoice.getOtherVoice(0)
                src_player.chipai(data[0],data[1])
                mjvoice.callAfterPlay(voice, src_player.send.bind(src_player, 
                    mjconst.EA_SYSTEM, mjconst.ET_CHIPENG_END))  
                break
            case mjconst.ET_PENGPAI:
                mjpaizhuo.hilightTextFang(src_player.wei) 
                voice = mjvoice.getOtherVoice(1)
                src_player.pengpai(data)
                mjvoice.callAfterPlay(voice, src_player.send.bind(src_player, 
                    mjconst.EA_SYSTEM, mjconst.ET_CHIPENG_END))  
                break
            case mjconst.ET_CHIPENG_END:
                context.table.setDapaiQuan(src_player)
                if(context.I.auto_dapai){
                    context.I.selectForAutoDa()
                    beginDapaiAfterPlay()
                }
                break
            case mjconst.ET_DAPAI_MINGGANG:
                voice = mjvoice.getOtherVoice(2)
                src_player.dapaiMinggang(data)
                mjvoice.callAfterPlay(voice, src_player.send.bind(src_player, 
                    mjconst.EA_SYSTEM, mjconst.ET_GANGPAI_END))
                break
            case mjconst.ET_MOPAI_MINGGANG:
                src_player.mopaiMinggang(data[0], data[1])
                voice = mjvoice.getOtherVoice(2)
                mjvoice.callAfterPlay(voice, src_player.send.bind(src_player, 
                    mjconst.EA_SYSTEM, mjconst.ET_GANGPAI_END)) 
                break
            case mjconst.ET_INSTANT_ANGANG:
                src_player.instantAngang(data)
                voice = mjvoice.getOtherVoice(3)
                mjvoice.callAfterPlay(voice, src_player.send.bind(src_player, 
                    mjconst.EA_SYSTEM, mjconst.ET_GANGPAI_END))
                break
            case mjconst.ET_DEFERED_ANGANG:
                src_player.deferedAngang(data)
                voice = mjvoice.getOtherVoice(3)
                mjvoice.callAfterPlay(voice, src_player.send.bind(src_player, 
                    mjconst.EA_SYSTEM, mjconst.ET_GANGPAI_END))    
                break    
            case mjconst.ET_GANGPAI_END:
                src_player.endGangpai()   
                break    
            case mjconst.ET_MESSAGE:
                voice = mjvoice.getOtherVoice(7)
                mjvoice.callAfterPlay(voice, () => mjutils.Tips.show(
                    src_player.fang_name + "说:" + data))
                break
            case mjconst.ET_PAI_QUAN:
                //console.log(context.I.fang_name + "获得牌权:", data)
                let panquan_for = data
                context.table.setYaopaiQuan(src_player)
                switch (panquan_for){
                    case mjconst.ET_MO_REQUEST:
                        context.I.beginMopai()
                        break;
                    case mjconst.ET_CHI_REQUEST:
                        mjpaizhuo.hilightTextFang(src_player.wei)
                        voice = mjvoice.getOtherVoice(0)
                        mjvoice.callAfterPlay(voice, () => {
                            if(Object.keys(context.I.chi_seq_list).length > 1 
                                && (!context.I.auto_dapai)){
                                    context.I.standupForChi() 
                            }else{
                                context.I.beginChipai()
                            }
                        })
                        break;
                    case mjconst.ET_PENG_REQUEST:
                        mjpaizhuo.hilightTextFang(src_player.wei)
                        voice = mjvoice.getOtherVoice(1)
                        mjvoice.callAfterPlay(voice, context.I.beginPengpai.bind(context.I))
                        break
                    case mjconst.ET_DAPAI_MINGGANG_REQUEST:
                        mjpaizhuo.hilightTextFang(src_player.wei)
                        voice = mjvoice.getOtherVoice(2)
                        mjvoice.callAfterPlay(voice, context.I.beginDapaiMinggang.bind(context.I))
                        break
                    case mjconst.ET_HU_REQUEST:
                        let hupai_type = mjutils.getHupaiType(this.tingtou_type, false)
                        voice = (data.hupai_type == mjconst.HU_7_DUI)?mjvoice.getOtherVoice(5):
                            mjvoice.getOtherVoice(4)
                        mjvoice.callAfterPlay(voice, context.I.beginHupai.bind(context.I))
                        break
                }
                break
            case mjconst.ET_HUPAI:
                // let sentence_list = []
                // data.sentence_list.forEach( seq => { sentence_list.push(
                //     [mjtable.Pot.getPaiList(seq[0]),seq[1],seq[2]])
                // })
                let hupai_info = data.hupai_info
                let sentence_list = data.sentence_list
                src_player.hupai({sentence_list, hupai_info})
                let my_score = 0
                my_score = context.I.dialect.loseScore(hupai_info.base_score, hupai_info.dianpao_fang)
                //my_score是我给出去的分,不是得到的分
                hupai_info.scores[context.I.fang] = my_score
                hupai_info.reasons[context.I.fang] = context.I.dialect.getReasons()

                voice = (hupai_info.hupai_type == mjconst.HU_DAPAI)?mjvoice.getOtherVoice(4):
                        (hupai_info.hupai_type == mjconst.HU_7_DUI)?mjvoice.getOtherVoice(5):
                        mjvoice.getOtherVoice(6)
            
                mjvoice.callAfterPlay(voice, context.I.send.bind(context.I,
                    mjconst.EA_SYSTEM, mjconst.ET_HUPAI_END, data))
                break
            case mjconst.ET_HUPAI_END:
                //context.table.ju_shu++
                context.table.history.push({
                    sentence_lists: [
                        context.table.getPlayerByFang(0).sentence_list.slice(),
                        context.table.getPlayerByFang(1).sentence_list.slice(),
                        context.table.getPlayerByFang(2).sentence_list.slice(),
                        context.table.getPlayerByFang(3).sentence_list.slice()],
                    hupai_info: data.hupai_info,                        
                    zhuangjia: context.table.zhuangjia,
                    laizi: context.table.laizi
                })
                context.table.forEachPlayer( (player,index) => {
                    player.total_score += data.hupai_info.scores[index]
                })

                context.table.clearYaopaiQuan()
                context.table.clearDapaiQuan()
                context.table.setZhuang(source)
                context.table.clearDapaiStatistic()
                setTimeout(() => {
                    if(context.table.history.length >= context.table.max_ju){
                        voice = mjvoice.getOtherVoice(11)
                        mjvoice.callAfterPlay(voice, () =>{
                            $("#button_warroom").click()
                            mjutils.Tips.show("已经完成所有局数")
                        })
                    }else{
                        mjpaizhuo.hilightTextFang(src_player.wei)
                        if(context.I.fang == 0){
                            src_player.send(mjconst.EA_SYSTEM, mjconst.ET_LAIZI)
                        }
                    }}, 
                    10000
                )
                break
            case mjconst.ET_CLOSE:
                if(I_am_on_the_table){
                    closeTable(data)
                }
                clearTable()
                break
        }
    }

    function actionAfterFapai(want){
        context.I.beginInitAction(want)
        $("#button_pass_after_fapai").hide()
        $("#button_action_after_fapai").hide()
    }

    function selectForDapai(can_hu, can_gang, can_peng,can_chi){
        if( (!can_chi) && (!can_peng) && (!can_hu) && (!can_gang)) {
            context.I.send(mjconst.EA_SYSTEM, mjconst.ET_MO_REQUEST) 
            return   
        }
        // mjutils.Tips.show("提示:" + (can_hu?"可胡":"") + (can_gang?"可杠":(can_peng?"可碰":"")) 
        //     + (can_chi?"可吃":""))

        let pos_r = right_buttons_pos.right
        let pos_b = right_buttons_pos.bottom
        let count = 0
        let gap = action_button_gap
        $("#button_mo_for_dapai").css({right:pos_r, bottom:pos_b})
        if(can_chi == null){
            $("#button_mo_for_dapai").text("过")
        }else{
            $("#button_mo_for_dapai").text("摸")
        }
        $("#button_mo_for_dapai").show()
        count++

        count += can_chi?1:0
        count += can_gang?1:(can_peng?1:0)
        count += can_hu?1:0
        if(count == 2){
            gap = action_button_gap*2
        }
        count = 1

        if(can_chi){
            $("#button_chi_for_dapai").css({right:pos_r, bottom:pos_b+count*gap})
            $("#button_chi_for_dapai").show()
            count++
        }

        if(can_gang){
            $("#button_gang_for_dapai").css({right:pos_r, bottom:pos_b+count*gap})
            $("#button_gang_for_dapai").show()
            count++
        }else
        if(can_peng){
            $("#button_peng_for_dapai").css({right:pos_r, bottom:pos_b+count*gap})
            $("#button_peng_for_dapai").show()
            count++
        }
        if(can_hu){
            $("#button_hu_for_dapai").css({right:pos_r, bottom:pos_b+count*gap})
            $("#button_hu_for_dapai").show()
        }
    }

    function selectForMopai(can_hu, can_gang){
        let pos_r = right_buttons_pos.right
        let pos_b = right_buttons_pos.bottom
        let count = 0
        let gap = action_button_gap

        $("#button_pass_for_mopai").css({right:pos_r,bottom:pos_b})
        $("#button_pass_for_mopai").show()
        count++

        if(can_hu){
            count++
        }else
        if(can_gang){
            count++
        }
        if(count == 2){
            gap = action_button_gap*2
        }
        count = 1
        if(can_gang){
            $("#button_gang_for_mopai").css({right:pos_r, bottom:pos_b+count*gap})    
            $("#button_gang_for_mopai").show()
            count++
        }
        if(can_hu){
            $("#button_hu_for_mopai").css({right:pos_r, bottom:pos_b+count*gap})
            $("#button_hu_for_mopai").show()      
        }
    }

    function selectForInitAction(){
        let pos_r = right_buttons_pos.right
        let pos_b = right_buttons_pos.bottom
        let count = 0
        let gap = action_button_gap

        $("#button_pass_after_fapai").css({right:pos_r,bottom:pos_b})
        $("#button_pass_after_fapai").show()
        gap = action_button_gap*2
        $("#button_action_after_fapai").css({right:pos_r, bottom:pos_b+ gap})    
        $("#button_action_after_fapai").show()
    }


    function hideAllActionButtons(){
        $("#button_hu_for_mopai").hide()    
        $("#button_gang_for_mopai").hide()     
        $("#button_pass_for_mopai").hide() 
        $("#button_chi_for_dapai").hide()     
        $("#button_peng_for_dapai").hide()        
        $("#button_hu_for_dapai").hide()
        $("#button_gang_for_dapai").hide()        
        $("#button_mo_for_dapai").hide()
    }

    function chiRequest(){
        hideAllActionButtons()
        //吃牌申请
        context.I.send(mjconst.EA_SYSTEM, mjconst.ET_CHI_REQUEST)
    }
    function pengRequest(){
        hideAllActionButtons()
        //吃牌申请
        context.I.send(mjconst.EA_SYSTEM, mjconst.ET_PENG_REQUEST)
    }

    function gangRequest(){
        hideAllActionButtons()
        context.I.send(mjconst.EA_SYSTEM, mjconst.ET_DAPAI_MINGGANG_REQUEST)
    } 

    function moRequest(){
        hideAllActionButtons()
        context.I.send(mjconst.EA_SYSTEM, mjconst.ET_MO_REQUEST)
    }

    function huRequest(){
        hideAllActionButtons()
        context.I.send(mjconst.EA_SYSTEM, mjconst.ET_HU_REQUEST)
    }    
    function zimoHupai(){
        hideAllActionButtons()        
        let voice = (context.I.hupai_type == mjconst.HU_7_DUI)?mjvoice.getOtherVoice(5):
            mjvoice.getOtherVoice(6)

        mjvoice.callAfterPlay(voice, context.I.beginHupai.bind(context.I))
    }

    function zimoGangpai(){
        hideAllActionButtons()
        if(context.I.gang_type ==  mjconst.GT_ANGANG){
            //console.log("我摸牌暗杠, 发送杠牌通知")
            mjvoice.callAfterPlay(mjvoice.getOtherVoice(3), context.I.beginInstantAngang.bind(context.I))
        }else
        if(context.I.gang_type == mjconst.GT_MOPAI_MINGGANG){ 
            //console.log("我摸牌明杠, 发送杠牌通知")
            mjvoice.callAfterPlay(mjvoice.getOtherVoice(2), context.I.beginMopaiMinggang.bind(context.I))
        }else{
            //console.log("自摸杠牌Error:", context.I.gang_type)
        }
    }

    //先打牌, 后发声音, 改善体验. 不然, 先发声音,后打牌,感觉打牌停顿
    function  beginDapaiAfterPlay(){
        if (context.table.isMyDapaiQuan() ){
            let index = context.I.selected
            if( index < 0 )  {
                return
            }
            let facetype = mjtable.Pot.get(index).facetype
            context.I.dapai(index)
            context.table.clearDapaiQuan()
            mjvoice.callAfterPlay(mjvoice.getDapaiVoice(facetype), context.I.send.bind(context.I, mjconst.EA_OTHER, mjconst.ET_DAPAI, index))
            context.I.selected = -1
        }
        
    }

    function beginChipaiAfterCheck(){
        if (context.table.isMyYaopaiQuan()){
            context.I.beginChipai()
            context.I.cancelStandup()
        }
    }
    function beginDeferedAngangAfterPlay(){
        if (context.table.isMyDapaiQuan()){
            if (context.I.an_gang_seq_list.length == 0) return
            mjvoice.callAfterPlay(mjvoice.getOtherVoice(3), context.I.beginDeferedAngang.bind(context.I))
        }
    }


    function zimoPass(){
        hideAllActionButtons()
    }

    class EventHandler {
        static raycaster = new THREE.Raycaster()
        static mouse = new THREE.Vector2()
        static screenSize = null
        static select_type = -1
        static x0 = -1
        static y0 = -1
        static touchstart_handler = EventHandler.onTouchStart.bind(EventHandler)
        static touchend_handler = EventHandler.onTouchEnd.bind(EventHandler)
        static mousedown_handler = EventHandler.onDragStart.bind(EventHandler)
        static mouseup_handler = EventHandler.onDragEnd.bind(EventHandler)
        static center_div = null

        
        static init(){
            this.center_div = document.getElementById("center")
            this.screenSize = mjgraph.getScreenSize()
            this.center_div.addEventListener('touchstart',this.touchstart_handler)
            this.center_div.addEventListener('touchend',this.touchend_handler)
            this.center_div.addEventListener('mousedown', this.mousedown_handler)
            this.center_div.addEventListener('mouseup', this.mouseup_handler)
        }

        static close(){
            this.center_div.removeEventListener('touchstart',this.touchstart_handler)
            this.center_div.removeEventListener('touchend',this.touchend_handler)
            this.center_div.removeEventListener('mousedown', this.mousedown_handler)
            this.center_div.removeEventListener('mouseup', this.mouseup_handler)
        }
        
        static onTouchStart (event){
            if(!I_am_on_the_table){
                return
            }
            if( context.I.toggle_auto_mode || !context.I.auto_dapai){
                var event = event || window.event;   
                event.preventDefault();   
                this.doSelection(event.touches[0].clientX, event.touches[0].clientY) 
                this.x0 = event.touches[0].clientX
                this.y0 = event.touches[0].clientY
            } 
        }
        static onTouchEnd (event){
            if(!I_am_on_the_table){
                return
            }

            if( context.I.toggle_auto_mode || !context.I.auto_dapai){
                var event = event || window.event;   
                event.preventDefault();   
                var x1 = event.changedTouches[0].clientX
                var y1 = event.changedTouches[0].clientY
                switch (this.select_type){
                    case 0: 
                        mjutils.Tips.show("请选牌和出牌")
                        break
                    case 1:
                        this.doGang(x1, y1, this.x0, this.y0)
                        break
                    case 3:
                        this.doDa(x1, y1, this.x0, this.y0)
                        break 
                }
                if(context.I.toggle_auto_mode){
                    context.I.toggle_auto_mode = false
                    context.I.auto_dapai = true
                }
            }
        }

        static onDragStart (event){
            if(!I_am_on_the_table){
                return
            }

            if( context.I.toggle_auto_mode || !context.I.auto_dapai){
                var event = event || window.event;
                event.preventDefault();   
                this.doSelection(event.clientX, event.clientY) 
                this.x0 = event.clientX
                this.y0 = event.clientY
            }
        }

        static onDragEnd (event){
            if(!I_am_on_the_table){
                return
            }

            if( context.I.toggle_auto_mode || !context.I.auto_dapai){
                var event = event || window.event;
                event.preventDefault()  
                var x1 = event.clientX
                var y1 = event.clientY

                switch (this.select_type){
                    case 0: 
                        mjutils.Tips.show("请选牌和出牌")
                        break
                    case 1:
                        this.doGang(x1, y1, this.x0, this.y0)
                        break
                    case 3:
                        this.doDa(x1, y1, this.x0, this.y0)
                        break
                }

                if(context.I.toggle_auto_mode){
                    context.I.toggle_auto_mode = false
                    context.I.auto_dapai = true
                } 
            }
        }
    
        static doDa(x1, y1, x0, y0) {
            // //判断移动的方向
            let distance = y0 - y1
            if(distance > 20) {
                beginDapaiAfterPlay()           
            }else{
                mjutils.Tips.show("请滑动出牌")
            }
        }
        static doGang(x1, y1, x0, y0) {
            // //判断移动的方向
            let distance= x0 - x1
            if(distance > 20) {
                beginDeferedAngangAfterPlay()
            }else{
                mjutils.Tips.show("请滑动出牌")
            }
        }
        
        static doSelection(x1, y1) {
            //将鼠标点击位置的屏幕坐标转成threejs中的标准坐标
            this.mouse.x = (x1*2 - this.screenSize.width)/this.center_div.offsetWidth
            this.mouse.y = (this.screenSize.height - y1*2)/this.center_div.offsetHeight
                        // 通过摄像机和鼠标位置更新射线
            this.raycaster.setFromCamera(this.mouse, mjgraph.getCamera());
            
            this.select_type = -1
            // 计算物体和射线的焦点
            let intersects = this.raycaster.intersectObjects(mjpaizhuo.mopaiqu[0].children, true)
            if (intersects.length > 0)
            {
                let index = intersects[0].object.parent.userData.index
                let want_angang = context.I.selectForAngang(index)
                if(want_angang[0]){
                    if(want_angang[1]){
                        beginDeferedAngangAfterPlay()
                    }else{
                        this.select_type = 1
                    }
                }else{
                    let valid_chi = context.I.selectForChi(index)
                    if(valid_chi){
                        beginChipaiAfterCheck()
                    }else{
                        let clicks = context.I.selectForDa(index)
                        if(clicks == 2){
                            beginDapaiAfterPlay()
                        }else
                        if(clicks == 1){
                            this.select_type = 3
                        }else{
                           console.log("不能打该牌!")
                        }
                    }
                }         
            }else{
                context.I.cancelSelectForDa()
                context.I.cancelSelectForAngang()
                context.I.cancelSelectForChi()
            }
        }    
    }
    window.chiRequest = chiRequest
    window.pengRequest = pengRequest
    window.gangRequest = gangRequest
    window.huRequest = huRequest
    window.moRequest = moRequest
    window.zimoHupai = zimoHupai
    window.zimoGangpai = zimoGangpai
    window.zimoPass = zimoPass
    window.actionAfterFapai = actionAfterFapai

    return {init,initWebSocket,closeTable,clearTable}

})