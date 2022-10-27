define(['../common/mjconst.js', '../common/mjutils.js', '../common/mjtable.js', './mjgraph.js', 
'./mjpaizhuo.js','./mjpaiyou.js','./mjdice.js', './mjpai.js','../dialects/list.js'], 
function (mjconst, mjutils, mjtable,mjgraph,mjpaizhuo,mjpaiyou,mjdice, mjpai,_) {
    function onPaizhuo(intention){
        let operation
        switch(intention){
            case 1://单步         
                let current_step = Playback.next()
                if(current_step >= 0){
                    Playback.execute(current_step)
                }
                $("#button_step").text(Playback.current_step)
                break
            case 2://计算
                operation = Playback.getLatestOperation()
                Playback.calculate(operation)
                break
            case mjconst.ET_DAPAI:
                player.dapai(data)
                break
            case 3://连续
                let breakpoint = parseInt($("#text_messages").val())
                if(!!!breakpoint){
                    breakpoint = Playback.operations.length
                }
                
                while(true){
                    let current_step = Playback.next()
                    if(current_step >= 0 && current_step < breakpoint){
                        Playback.execute(current_step)
                        $("#button_step").text(current_step)
                    }else{
                        break
                    }    
                }
                break
            case 4://重开
                Playback.reset()
                $("#button_step").text("单步")
                mjgraph.rerender()
                break
            case 5://旋转
                Playback.rotate()
                Playback.reset()
                $("#button_step").text("单步")
                mjgraph.rerender()        
                break
            
        }
    }

    function load() {
        let filename = window.location.search        
        mjgraph.init()
        mjpaizhuo.init(() => Playback.getRecord(filename.slice(1)))
        mjpai.init()
        mjdice.init() 
        mjpaizhuo.display()
        mjgraph.rerender()
        mjutils.Tips.setRows(4)
        mjtable.setDebug()
        let size = mjgraph.getPaiSize1()
        let factors = mjgraph.getFactors()
        $("#button_laizi").css({bottom:(40+size.height)*factors.scale})
    } 


    class Playback{
        static info
        static table
        static players = []
        static operations = []
        static current_step = 0
        static current_fang = 0
        static latest_operation = null

        static next(){
            let current_step = -1
            if(this.current_step < this.operations.length){
                current_step = this.current_step
                this.current_step++
                return current_step
            }else{
                return current_step
            }
        }
        static rotate(){
            this.current_fang = (this.current_fang + 1)%4
        }

        static getRecord(filename){
            $.ajax({
                url:'/majiang/data//' + filename,
                type: "GET",
                contentType:"application/json",
                success: (data) => {
                    if(data.length > 0){
                        console.log("getRecord",data[0])
                        Playback.info = data[0]
                        Playback.operations = data.slice(1)
                        Playback.reset()
                    }
                },
                error: (err) => {
                    console.log("error", err)
                }
            })
        }

        static reset(){
            mjpaizhuo.placeTextFang(this.current_fang)
            mjpaizhuo.showTextFang(0)
            mjpaizhuo.showTextFang(1)
            mjpaizhuo.showTextFang(2)
            mjpaizhuo.showTextFang(3)

            this.table  = mjtable.Table.create(1, "table_id",this.info)
            this.table.setPlayers(mjpaiyou.createPlayers(this.table))
            this.table.auto_mode = mjconst.UI_HUMAN_TEST
            this.table.rotatePlayers(this.current_fang)
            this.current_step = 0
            this.table.laizi.hide()
            mjutils.Tips.clear()
            mjtable.Pot.hideAll()
            mjtable.Table.setDefault(1)
            mjgraph.rerender()
        }

        static execute(step){
            let operation = this.operations[step]
            let player = this.table.getPlayerByFang(operation.fang)
            let action = operation.action
            let data = operation.param
            switch(action){
                case mjconst.ET_LAIZI:
                    this.table.setDiceAndLaizi(data[0], data[1])
                    mjdice.rotate()
                    break
                case mjconst.ET_FAPAI:
                    player.fapai(data)
                    break
                case mjconst.ET_MOPAI:
                    mjpaizhuo.hilightTextFang(player.wei)
                    player.mopai(data)
                    let face = new mjtable.Face(data)
                    mjutils.Tips.show(`${player.fang_name}:摸${face.getFaceName()}`)
                    break
                case mjconst.ET_DAPAI:
                    player.dapai(data)
                    break    
                case mjconst.ET_PENGPAI:
                    mjpaizhuo.hilightTextFang(player.wei)
                    player.pengpai(data)
                    break
                case mjconst.ET_INIT_ACTION:
                    player.initAction(data)
                    break    
                case mjconst.ET_MOPAI_MINGGANG:
                    player.mopaiMinggang(data[0], data[1])
                    break
                case mjconst.ET_DAPAI_MINGGANG:
                    player.dapaiMinggang(data)
                    break
                case mjconst.ET_INSTANT_ANGANG:
                    player.instantAngang(data)
                    break
                case mjconst.ET_DEFERED_ANGANG:
                    player.deferedAngang(data)
                    break
                case mjconst.ET_CHIPAI:
                    player.chipai(data[0], data[1])
                    break
                case mjconst.ET_HUPAI:
                    player.hupai(data)
                case mjconst.ET_HUPAI_END:
                    console.log("ET_HUPAI_END")
                    break    
            }
            this.latest_operation = operation

        }
        static calculate(operation){
            let base_score, lose_score, result
            let data = operation.param
            let fang = operation.fang
            let cur_player = Playback.table.getPlayerByFang(fang)
            switch(operation.action){
                case mjconst.ET_MOPAI:
                    result = cur_player.calcMopai()    
                    if(result.can_gang || result.can_hu){
                        mjutils.Tips.show(
    `${cur_player.fang_name}:${result.can_hu?"可胡":""}${result.can_gang?"可杠":""}`)
                    }else{
                        cur_player.selectForAutoDa(true)
                    }
                    break
                case mjconst.ET_DAPAI:
                    let dapai_tuple = Playback.table.getCurrentDapai()             
                    Playback.table.forEachPlayer( player => {                
                        if(player.fang == operation.fang){
                            return false
                        }                
                        result = player.calcDapai(dapai_tuple)
                        if(result.can_chi || result.can_peng || result.can_hu || result.can_gang){                           
                            mjutils.Tips.show(
    `${player.fang_name}:${result.can_hu?"可胡":""}${result.can_gang?"可杠":(result.can_peng?可碰:"")}${result.can_chi?"可吃":""}`)
                        }else{
                            mjutils.Tips.show(`${player.fang_name}:不要`)
                        }
                    })
                    break
                case mjconst.ET_INIT_ACTION:
                case mjconst.ET_FAPAI:
                    cur_player.selectForAutoDa(true)
                    break
                case mjconst.ET_PENGPAI:
                case mjconst.ET_CHIPAI:
                    cur_player.selectForAutoDa()
                    break
                case mjconst.ET_HUPAI:
                    base_score = cur_player.dialect.winScoreBase()
                    mjutils.Tips.show(`${cur_player.fang_name}:${base_score}基本点`)
                    break
                case mjconst.ET_HUPAI_END:
                    if(data.hupai_fang != cur_player.fang){
                        //别人胡牌, 我要给钱
                        lose_score = cur_player.dialect.loseScore(data.base_score, data.dianpao_fang)
                        mjutils.Tips.show(`${cur_player.fang_name}:输${lose_score}点`)
                    }
                    break    
                default:
                    mjutils.Tips.show("此步不需要计算")
                    mjutils.Tips.show(`${mjutils.getFangName(player.fang)}:不要`)
                }


        }
        static getLatestOperation(){
            return this.latest_operation
        }

    }

    window.onPaizhuo = onPaizhuo
    load()
})
