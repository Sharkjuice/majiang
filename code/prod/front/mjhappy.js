define(['./mjconst.js', './mjutils.js', './mjtable.js', './mjgraph.js', './mjpaizhuo.js',
'./mjpaiyou.js','./mjdice.js', './mjpai.js'], 
function (mjconst, mjutils, mjtable,mjgraph,mjpaizhuo,mjpaiyou,mjdice, mjpai) {
    function onPaizhuo(intention){
        let operation
        switch(intention){
            case 1://单步         
                operation = Playback.nextOperation()
                if(operation){
                    Playback.execute(operation)
                }
                break
            case 2://计算
                operation = Playback.current_operation
                if(operation.action == mjconst.ET_MOPAI){
                    let player = Playback.table.getPlayerByFang(operation.fang)
                    result = player.calcMopai()    
                    if(result.can_gang || result.can_hu){
                        mjtable.Tips.show(
                            `${mjutils.getFangName(player.fang)}:
                             ${result.can_hu?"可胡":""}
                             ${result.can_gang?"可杠":""}`)
                    }else{
                        player.selectForAutoDa()
                        //mjtable.Tips.show(`${mjutils.getFangName(player.fang)}:"不要"`)
                    }
                }else
                if(operation.action == mjconst.ET_DAPAI){
                    let dapai_tuple = Playback.table.getCurrentDapai()             
                    Playback.table.forEachPlayer( player => {                
                        if(player.fang == operation.fang){
                            return false
                        }                
                        result = player.calcDapai(dapai_tuple)
                        if(result.can_chi || result.can_peng || result.can_hu || result.can_gang){                           
                            mjtable.Tips.show(
                               `${mjutils.getFangName(player.fang)}:
                                ${result.can_hu?"可胡":""}
                                ${result.can_gang?"可杠":(result.can_peng?"可碰":"")}
                                ${result.can_chi?"可吃":""}`)                
                        }else{
                            mjtable.Tips.show(`${mjutils.getFangName(player.fang)}:"不要"`)
                        }
                    })
                }else{
                    mjtable.Tips.show("没有打/摸牌,无法计算")
                }
                break
            case mjconst.ET_DAPAI:
                player.dapai(data)
                break
            case 3://连续
                Playback.operations.forEach( (operation,index) => {
                    if(index < Playback.current_step){
                        return false
                    }
                    Playback.execute(operation)
                })
                break
            case 4://重开
                Playback.reset()
                mjgraph.rerender()
                break
            case 5://旋转
                Playback.rotateFang()
                Playback.reset()
                mjgraph.rerender()        
                break
            
        }
    }

    function load() {
        mjgraph.init()
        mjpaizhuo.init(() => Playback.reset())
        mjpai.init()
        mjdice.init() 
        mjpaizhuo.display()
        //let filename = window.location.search
        //Playback.getRecord(filename.slice(1))
        mjgraph.rerender()
        mjtable.Tips.setRows(4)
        mjtable.setDebug()
        let size = mjgraph.GParams.paiSize1()
        let factors = mjgraph.GParams.factors()
        $("#button_laizi").css({bottom:(40+size.height)*factors.scale})
    } 


    class Playback{
        static table
        static players = []
        static operations = []
        static current_step = 0
        static current_fang = 0
        static current_operation = null

        static nextOperation(){
            let operation 
            if(this.current_step < this.operations.length){
                operation = this.operations[this.current_step]
                this.current_operation = operation
                this.current_step++
            }
            return operation
        }
        static rotateFang(){
            this.current_fang = (this.current_fang + 1)%4
        }
    
        static getRecord(filename){
            $.ajax({
                url:'/majiang/admin/record/' + filename, 
                type: "GET",
                contentType:"application/json",
                success: (data) => {
                    if(data.length > 0){
                        Playback.table.rules = data[0]
                        Playback.operations = data.slice(1)
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

            this.table  = mjtable.Table.create(1, "table_id")
            this.table.setPlayers(mjpaiyou.createPlayers(this.table))
            this.table.auto_mode = mjconst.UI_HUMAN_TEST
            this.table.rotatePlayers(this.current_fang)
            this.current_step = 0
            this.table.laizi.hide()
            mjtable.Tips.clear()
            mjtable.Pot.hide()
            mjtable.Table.setDefault(1)

            this.table.getPlayerByFang(0).fapai([108,109,116,117,118,120,121,122,124,125,126,128,129,130])
            this.table.getPlayerByFang(1).fapai([0,1,2,3,4,5,6,7,8,9,10,18,19,27])
            this.table.getPlayerByFang(2).fapai([36,37,38,39,40,41,42,43,44,45,54,63,46,55])
            this.table.getPlayerByFang(3).fapai([72,73,74,75,76,77,78,79,80,81,90,99,82,91])
            this.table.getPlayerByFang(0).sentence_list.push(
                [mjtable.Pot.getPaiList([116,117,118]), mjconst.SEQ_PENG,true],
                [mjtable.Pot.getPaiList([120,121,122]), mjconst.SEQ_PENG,true],
                [mjtable.Pot.getPaiList([124,125,126]), mjconst.SEQ_PENG,true],
                [mjtable.Pot.getPaiList([128,129,130]), mjconst.SEQ_PENG,true],
                [mjtable.Pot.getPaiList([108,109]), mjconst.SEQ_PENG,true])


            this.table.getPlayerByFang(1).sentence_list.push(
                [mjtable.Pot.getPaiList([0,1,2]), mjconst.SEQ_CHI,true],
                [mjtable.Pot.getPaiList([3,4,5]), mjconst.SEQ_CHI,true],
                [mjtable.Pot.getPaiList([6,7,8]), mjconst.SEQ_CHI,true],
                [mjtable.Pot.getPaiList([9,18,27]), mjconst.SEQ_PENG,true],
                [mjtable.Pot.getPaiList([10,19]), mjconst.SEQ_JIANG,true])

            this.table.getPlayerByFang(2).sentence_list.push(
                [mjtable.Pot.getPaiList([36,37,38]), mjconst.SEQ_CHI,true],
                [mjtable.Pot.getPaiList([39,40,41]), mjconst.SEQ_CHI,true],
                [mjtable.Pot.getPaiList([42,43,44]), mjconst.SEQ_CHI,true],
                [mjtable.Pot.getPaiList([45,54,63]), mjconst.SEQ_PENG,true],
                [mjtable.Pot.getPaiList([46,55]), mjconst.SEQ_JIANG,true])

            this.table.getPlayerByFang(3).sentence_list.push(
                [mjtable.Pot.getPaiList([72,73,74]), mjconst.SEQ_CHI,true],
                [mjtable.Pot.getPaiList([75,76,77]), mjconst.SEQ_CHI,true],
                [mjtable.Pot.getPaiList([78,79,80]), mjconst.SEQ_CHI,true],
                [mjtable.Pot.getPaiList([81,90,99]), mjconst.SEQ_PENG,true],
                [mjtable.Pot.getPaiList([82,91]), mjconst.SEQ_JIANG,true])

            this.table.forEachPlayer( player => {
                player.pai_list = []
                player.daopai()
            })

            let fa = [
                this.table.getPlayerByFang(0).mopai(112),
                this.table.getPlayerByFang(0).mopai(113),
                this.table.getPlayerByFang(0).mopai(114),
                this.table.getPlayerByFang(0).mopai(115)
            ]
            let dnxb = [
                this.table.getPlayerByFang(0).mopai(119),
                this.table.getPlayerByFang(0).mopai(123),
                this.table.getPlayerByFang(0).mopai(127),
                this.table.getPlayerByFang(0).mopai(131)
            ]

            dnxb.forEach( (facai,index) => {
                this.table.getPlayerByFang(0).dapai(facai.index)
                facai.model.scale.set(4,4,4)
                facai.model.position.set(250+150*(index-1.5),200,1)
            })


            fa.forEach( (facai,index) => {
                this.table.getPlayerByFang(0).dapai(facai.index)
                facai.model.scale.set(4,4,4)
                facai.model.position.set(250+150*(index-1.5),0,1)
            })
            mjgraph.rerender()
            mjtable.Tips.show("老徐祝朋友们:")
            mjtable.Tips.show("    生龙活虎!")
            mjtable.Tips.show("    龙腾虎跃!")
            mjtable.Tips.show("    健康快乐!")

        }

        static execute(operation){
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
                    player.mopai(data)
                    let face = new mjtable.Face(data)
                    mjtable.Tips.show(`${mjutils.getFangName(player.fang)}:摸${face.getFaceName()}`)
                    break
                case mjconst.ET_DAPAI:
                    player.dapai(data)
                    break    
                case mjconst.ET_PENGPAI:
                    player.pengpai(data)
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
                    break    
            }
        }

    }

    window.onPaizhuo = onPaizhuo
    load()
})
