define(['../common/mjconst.js','../common/mjtable.js','../common/mjutils.js', 
'../common/connection.js', './mjgraph.js', './mjuicontrol.js','./mjpai.js', 
'./mjvoice.js'], 
function (mjconst, mjtable, mjutils, conn, mjgraph, mjuicontrol, mjpai, mjvoice, mjvoicebase) {

    //全局变量, 减少冗余代码
    let context = {}

    //action const
    const LAUNCH_TABLE_DIALOG = 1
    const LAUNCH_WARROOM_DIALOG = 2
    const SEND_HURRY_UP = 3
    const SWITCH_AUTO_MODE = 4
    const START_ADHOC_TABLE = 5
    const START_PRIVATE_TABLE = 6
    const ADD_ROBOT = 7
    const STOP_TABLE = 8
    const SHOW_PREVIOUS_WAR = 9
    const SHOW_NEXT_WAR = 10
    const TABLE_TEST_1 = 100
    const TABLE_TEST_2 = 101

    const YOU_ARE_NOT_ON_THE_TABLE = "你还不在牌桌上!"

    function getDialect(){
        let dialect = $('input[name="radio_rule"]:checked').val()
        return dialect
    }

    function getTableName(){
        let name = $("#text_table_id").val()
        return name
    }

    function getPaiyouName(){
        let name = $("#text_my_name").val()
        if(!name){
            return "小强"
        }
        return name
    }
    function getRobotShu(){
        let robot_shu = $('input[name="radio_robot_shu"]:checked').val()
        return robot_shu
    }

    function getPoolType(){
        if(window.location.href.includes("/majiang/app/devel")){
            return 1
        }else
        if(window.location.href.includes("/majiang/app")){
            return 0
        }else{
            return -1
        }
    }

    function onTable(intention){
        let dialect, robot_shu=0, url, table_name, player_name,conn_client
        let I_am_on_the_table = mjtable.refreshContext(context)
        switch(intention){
            case LAUNCH_TABLE_DIALOG:
                if($("#tab_table").is(":visible")){
                    $("#tab_table").hide()
                }else{
                    $("#tab_table").show()
                }
                break            
            case LAUNCH_WARROOM_DIALOG:    
                if(I_am_on_the_table){
                    onWarroom()
                }else{
                    mjutils.Tips.show(YOU_ARE_NOT_ON_THE_TABLE)
                }
                break  
            case SEND_HURRY_UP:
                if(I_am_on_the_table){
                    context.I.send(mjconst.EA_ALL, mjconst.ET_MESSAGE, "请快点打牌")
                }else{
                    mjutils.Tips.show(YOU_ARE_NOT_ON_THE_TABLE)
                }
                break
            case SWITCH_AUTO_MODE:
                if(I_am_on_the_table){
                    //为什么要搞个toggle_auto_mode? 因为有可能有这个次序
                    //auto_dapai==false时摸牌了(等待手动打牌); 马上换模式, 这时候并没有自动打牌
                    //用户比较困惑, 所有干脆在切换之后, 要手动打一张牌, 才能真正切换
                    if(context.I.auto_dapai){
                        context.I.auto_dapai = false
                        $("#button_switch").text("自动")
                    }else{
                        context.I.toggle_auto_mode = true
                        $("#button_switch").text("手动")
                    }
                }
                break
            case START_ADHOC_TABLE:
                if(!mjvoice.isVoiceReady()){
                    mjutils.Tips.show("请稍等...")
                }
                if(I_am_on_the_table){
                    mjutils.Tips.show("请先结束当前牌桌!")
                    return 
                }
                mjvoice.getOtherVoice(8).play()
                dialect = getDialect()
                let pool_type = getPoolType()
                url = `/majiang/admin/pool/${pool_type}/table/adhoc/start/4`
                player_name = getPaiyouName()
                startTable(player_name, url, dialect, 3)    
                break
            case START_PRIVATE_TABLE:
                if(!mjvoice.isVoiceReady()){
                    mjutils.Tips.show("请稍等...")
                }
                if(I_am_on_the_table){
                    mjutils.Tips.show("请先结束当前牌桌!")
                    return 
                }
                if(table_name == ""){
                    mjutils.Tips.show("请输入牌桌号!")
                }
                mjvoice.getOtherVoice(8).play()
                robot_shu = 0
                table_name = getTableName()
                player_name = getPaiyouName()
                url = "/majiang/admin/table/private/" + table_name + "/start/1"
                startTable(player_name, url)
                break
            case ADD_ROBOT:
                if(!I_am_on_the_table){
                    mjutils.Tips.show(YOU_ARE_NOT_ON_THE_TABLE)
                    return 
                }
                if(context.table.player_shu == 4){
                    mjutils.Tips.show("牌桌上有4人!")
                    return 
                }

                robot_shu = getRobotShu()
                url = `/majiang/admin/table/${table.table_route}/join/${robot_shu}`
                addRobots(player_name,url,robot_shu)
                break
            case STOP_TABLE:
                if(!I_am_on_the_table){
                   mjutils.Tips.show(YOU_ARE_NOT_ON_THE_TABLE)
                   return
                }                
                stopTable()
                break
            case SHOW_NEXT_WAR:
                showWarResult(true)
                break
            case SHOW_PREVIOUS_WAR:
                showWarResult(false)
                break
            case TABLE_TEST_1:
                if(I_am_on_the_table && context.table.connection.status == conn.CONN_BROKEN){
                    mjutils.Tips.show("恢复网络...")                        
                    //首先重新init websoicket
                    mjuicontrol.initWebSocket(context.table.room_id, context.table.client_id)           
                }
                break
            case TABLE_TEST_2:
                conn_client = conn.getConnection(context.table.client_id)
                if(conn_client){
                    conn_client.connector.close()
                }
                break               
        }
    }
    function conn_remote_send(client_id, table_id, body){
        let conn_remote = conn.getConnection(client_id)
        console.log('conn_remote_send', body)
        conn_remote.send({client_id, table_id, type: mjconst.ET_LOGIN, body})
    }

    function init_ws_handler(client_id, table_id, body){
        console.log("initWebSocket", client_id)
        if(mjpai.ready()){
            console.log("inimtWebSocket, mjpai.ready")
            mjpai.onReady()
            conn_remote_send(client_id, table_id, body)                        
        }else{                        
            mjpai.onReady(() =>  {
                console.log("inimtWebSocket, mjpai not ready")
                conn_remote_send(client_id, table_id, body)
            })
        }
    }
  
    function startTable(name, url, dialect, robot_shu=0){
        $.post(url).done( res => {
            if(res.result < 0){
                mjutils.Tips.show("没有空闲牌桌!")
            }else{
                let room_id = Math.floor(res.route/100)
                let table_id = res.route%100
                let client_id = mjutils.getUniqueId()
                //mjtable.setDebug()
                if( dialect == null){
                    dialect = res.dialect
                }
                let body = {
                    name, dialect,
                    max_ju:res.max_ju,
                    table_route: res.route, 
                    table_name: res.name,
                    robot_only: false,
                    robot_shu: robot_shu
                }
                mjuicontrol.initWebSocket(room_id, client_id, init_ws_handler.bind(null, 
                    client_id, table_id, body))
            
            }
        })
    }

    function addRobots(name, url, robot_shu){
        $.post(url).done( res => {
            if(res.result < 0){
                mjutils.Tips.show(res.msg)
            }else{
                context.I.send(mjconst.EA_SYSTEM, mjconst.ET_LOGIN,{robot_only:true,robot_shu})
                $("#tab_table").hide()     
            }
        })
    }

    function stopTable(){
        //console.log("stopTable")
        let reason = "有急事不玩了"
        context.I.send(mjconst.EA_SYSTEM, mjconst.ET_CLOSE, reason)
        mjuicontrol.closeTable(reason)
        mjuicontrol.clearTable()
        context = {}
        
    }

    let factors
    function init(){
        displayTab("#firstmenu")
        $('.nav-item a').click(function(event){
            displayTab(event.target.hash)
            $(this).tab('show');
        })
        let size = mjgraph.getPaiSize1()
        factors = mjgraph.getFactors()
        $("#button_laizi").css({bottom:(40+size.height)*factors.scale})
        
    }

    function getInnerHtmlOfRuleList(dialects) {
        let html = '<div">'
        Object.keys(dialects).forEach( (key,index) =>
            {
                let html_rule = getInnerHtmlOfRule(key, index, dialects[key].getDoc())
                html += html_rule
            })
        html += "</div>"
        return html
    }

    function getInnerHtmlOfRule(dialect,index, doc) {
        if(index == 0){
            return `<label class="radio-inline">\
            <input type="radio" name="radio_rule" title="${doc}" radio_rule_${index}" value="${dialect}" 
            checked> ${dialect}\
            </label>`
        }else{
            return `<label class="radio-inline">\
            <input type="radio" name="radio_rule" title="${doc}" id="radio_rule_${index}" value="${dialect}" 
            > ${dialect}\
            </label>`    
        }
    }
    
    let inner_html_my_name = '<input type="text" id="text_my_name" class="form-control">'


    function displayTab(hash){
        switch(hash){
            case "#firstmenu":
                $("#firstMyName").html(inner_html_my_name)
                $("#secondMyName").html('')
                $("#firstRules").html(getInnerHtmlOfRuleList(mjtable.Table.dialect_list))
                break
            case "#secondmenu":
                $("#firstMyName").html('')
                $("#secondMyName").html(inner_html_my_name)
                break
            case "#thirdmenu":                
                if(!mjtable.refreshContext(context)){
                    $("#form_table_name").text('--')
                    $("#form_total_jushu").text(0)
                    $("#form_rules").text("--")
                    $("#form_players").text(0)
                    $("#form_owner").text("--")
                    $("#form_start_time").text("--")
                    $("#btn-custom-1").prop("disabled",true)
                }else{
                    $("#form_table_name").text(context.table.table_name)
                    $("#form_rules").text(context.table.dialect_name)
                    $("#form_total_jushu").text(context.table.ju_shu)
                    $("#form_players").text(`${context.table.player_shu}/${context.table.robot_shu}`)
                    $("#form_owner").text(context.table.getPlayerByFang(0).name)
                    $("#form_start_time").text(context.table.start_time)
                }  
                break
            case "#fourthmenu":
                $("#firstMyName").html('')
                $("#secondMyName").html('')
                $("#fourthMyName").html(inner_html_my_name)
                $("#fourthRules").html(getInnerHtmlOfRuleList(mjtable.Table.dialect_list))
                //$("#fourthmenu").tooltip();
            break    
        }
    }

    function onWarroom(){
        if($("#warroom").is(":visible")){
            $("#warroom").hide()
            return
        }
        let I_am_on_the_table = mjtable.refreshContext(context)

        if(!I_am_on_the_table){
            mjutils.Tips.show(YOU_ARE_NOT_ON_THE_TABLE)
            return
        }

        let total_jushu = context.table.history.length

        if(total_jushu == 0){
            context.table.forEachPlayer( player => {
                let wei = player.wei
                $("#warroom_wei_" + wei).text(player.fang_name)
                $("#warroom_name_" + wei).text(player.name)
           })
        }else{
            if(Warroom.current_jushu == -1){                
                Warroom.current_jushu = total_jushu - 1
            }
            Warroom.refreshButtons()
            Warroom.showCurrentGame()
        }
        $("#warroom").show()
    }

    class Warroom {
        static current_jushu = -1

        static showCurrentGame(){
            let current_paiju = context.table.history[Warroom.current_jushu]
            let sentence_lists = current_paiju.sentence_lists

            context.table.forEachPlayer( player => {
                let wei = player.wei
                if(player.fang == current_paiju.zhuangjia){
                    $("#warroom_wei_" + wei).text(`${player.fang_name}[庄]`)
                }else{
                    $("#warroom_wei_" + wei).text(player.fang_name)
                }
                $("#warroom_name_" + wei).text(player.name)
                $("#warroom_hupai_shu_" + wei).text(`${player.hu_shu}次`)
                $("#warroom_total_score_" + player.fang).text(`${player.total_score}`)
            })

            sentence_lists.forEach((sentence_list, index) => {
                let display_list = []
                sentence_list.forEach(sentence => {
                    let seq = sentence[0]
                    let seq_type = sentence[1]
                    seq.forEach( pai => {
                        display_list.push(pai.getFontChar())
                    })    

                    if(seq_type == mjconst.SEQ_AN_GANG ){
                        display_list.pop()
                        display_list.pop()
                        display_list.push('\u2634')
                    }else
                    if(seq_type == mjconst.SEQ_MING_GANG){
                        display_list.pop()
                        display_list.pop()
                        display_list.push('\u2631')
                    }
                })

                let display_list_1 = display_list.slice(0,7)
                let display_list_2 = display_list.slice(7)
                let wei = context.I.fangToWei(index)

                $("#pai_list_0_" + wei).text(display_list_1.join(""))
                $("#pai_list_1_" + wei).text(display_list_2.join(""))
                $("#pai_list_1_" + wei).text(display_list_2.join(""))
                $("#warroom_this_score_" + wei).text(current_paiju.hupai_info.scores[index])
                $("#warroom_score_reason_" + wei).text(current_paiju.hupai_info.reasons[index])
                if(index == current_paiju.hupai_info.hupai_fang){
                    $("#warroom_pai_list_" + wei).addClass("text-danger")
                    $("#warroom_pai_list_" + wei).removeClass("text-white")
                }else{
                    $("#warroom_pai_list_" + wei).removeClass("text-danger")
                    $("#warroom_pai_list_" + wei).addClass("text-white")
                }
            })
            if(context.table.dialect.hasLaizi()){
                $("#warroom_laizi").text(current_paiju.laizi.getFaceName())
            }else{
                $("#warroom_laizi").text("--")
            }
            $("#warroom_type").text(mjutils.getHupaiTypeName(current_paiju.hupai_info.hupai_type))
            $("#warroom_dianpao").text(mjutils.getFangName(current_paiju.hupai_info.dianpao_fang))
        }

        static refreshButtons(){
            $("#button_game_previous").prop("disabled",false)
            $("#button_game_next").prop("disabled",false)
            $("#button_game_current").prop("disabled",true)

            let total_jushu = context.table.history.length
            if(this.current_jushu >= total_jushu -1 ){
                $("#button_game_next").prop("disabled",true)
                this.current_jushu = total_jushu -1
            }
            if(this.current_jushu <= 0){
                $("#button_game_previous").prop("disabled",true)
                this.current_jushu = 0
            }
            $("#button_game_current").text("第" + (this.current_jushu +1) + "局")
        }
    }


    function showWarResult(next){
        if(!!next){
            Warroom.current_jushu++
        }else{
            Warroom.current_jushu--
        }
        Warroom.refreshButtons()
        Warroom.showCurrentGame()
    }
  
    window.onTable = onTable

    return {init}
})