define(['../common/mjutils.js', '../common/mjconst.js', '../common/mjtable.js',
'../common/mjplayer.js','./mjgraph.js', './mjpai.js', './mjpaizhuo.js'], 
function (mjutils, mjconst, mjtable, mjplayer, mjgraph, mjpai, mjpaizhuo) {
    function createPlayers(table){
        let players = []
        players[0] = new Paiyou(table, 0)
        players[1] = new Paiyou(table, 1)
        players[2] = new Paiyou(table, 2)
        players[3] = new Paiyou(table, 3)
        return players
    }

    class Paiyou extends mjplayer.Player{
        constructor(table,fang){
            super(table,fang)
            this.current_pos = -1//摸牌放牌的位置.
            this.dapai_shu = 0
            this.enable_auto = false
        }

        reset(){
            super.reset()
            this.dapai_shu = 0
        }

        getPaiByIndex(index){
            let pai =  mjtable.Pot.get(index)
            if (pai == null){
                pai = new mjpai.Pai(index)
                pai.setVisible(true)
                mjtable.Pot.set(index, pai)
            }        
            return pai
        }

        fapai(index_list){
            super.fapai(index_list)
            this.show()
        }

        beginInitAction(want){    
            if(super.beginInitAction(want)){
                mjutils.Tips.show(this.fang_name + this.table.dialect.initActionName())
                this.show()
            }
        }

        initAction(data){
            mjutils.Tips.show(this.fang_name + this.table.dialect.initActionName())
            if(super.initAction(data)){
                this.show()                
            }
        }
    
        mopai(index){
            let pai = super.mopai(index)
            pai.model.userData.index = pai.index
            pai.showMopai(this.wei, this.current_pos)
            mjgraph.rerender() 
            return pai
        }  
        
        dapai(index){
            let current_daipai = super.dapai(index)
            mjutils.Tips.show(this.fang_name + "打牌:" + current_daipai.getFaceName())
            current_daipai.showDapai(this.wei, this.dapai_shu)
            this.dapai_shu++
            this.show()
        } 

        
        chipai(seq,order){
            mjutils.Tips.show(this.fang_name + "吃牌")
            super.chipai(seq, order)
            let dapai_player = this.table.getCurrentDapai().player
            dapai_player.dapai_shu--
            this.show()
        }

        pengpai(seq){
            mjutils.Tips.show(this.fang_name + "碰牌")
            super.pengpai(seq)
            let dapai_player = this.table.getCurrentDapai().player
            dapai_player.dapai_shu--
            this.show()
        }


        dapaiMinggang(seq){  
            mjutils.Tips.show(this.fang_name + "打牌明杠")
            super.dapaiMinggang(seq)
            let dapai_player = this.table.getCurrentDapai().player
            dapai_player.dapai_shu--
            this.show()
        }

        mopaiMinggang(sentence, gang_pai){
            mjutils.Tips.show(this.fang_name + "摸牌明杠")
            super.mopaiMinggang(sentence, gang_pai)
            this.show() 
        }       

        instantAngang(seq){  
            mjutils.Tips.show(this.fang_name + "摸牌暗杠")
            super.instantAngang(seq)
            this.show()
        }  
        
        deferedAngang(seq){  
            mjutils.Tips.show(this.fang_name + "延后暗杠")
            super.deferedAngang(seq)
            this.show()
        }

        hupai(data){
            mjutils.Tips.show(this.fang_name + "胡牌")
            super.hupai(data)
            mjpaizhuo.showTextHupai(this.wei)
            this.table.forEachPlayer( player => {
                    player.show(true)
            })
        }
        
        //选牌， 准备出牌. 返回值2: 双击; 1:单击; 0 没有选中合适的牌
        selectForDa(index){
            //当前牌已经选中， 表示是双击
            if(this.selected == index){
                return 2
            }else{
                let allowed_dapai_list = this.dialect.allowedDapaiList()
                if(allowed_dapai_list.find(pai => pai.index == index)){
                    this.selected = index
                    mjtable.Pot.get(index).toggleHilight()
                    mjgraph.rerender()
                    return 1
                }else{
                    return 0
                }
            }
        }

        cancelSelectForDa(){
            //当前牌已经选中， 啥也不做
            if(this.selected != -1){ 
                mjtable.Pot.get(this.selected).cancelHilight()
                this.selected = -1
            }
            mjgraph.rerender()
        }

        showSeq(seq, current_pos, seq_type, daopai){
            let that = this
            seq.forEach((pai,index) =>{            
                if(seq_type == mjconst.SEQ_AN_GANG){
                    if(daopai){
                        current_pos = pai.showMinggangpai(that.wei, current_pos, index)
                    }else{
                        current_pos = pai.showAngangpai(that.wei, current_pos, index)
                    }
                }else
                if(seq_type == mjconst.SEQ_MING_GANG){
                    current_pos = pai.showMinggangpai(that.wei, current_pos, index)
                }else{
                    current_pos = pai.showChipengpai(that.wei, current_pos)
                }
            })
            if(this.wei < 2){
                return current_pos + 5
            }else{
                return current_pos - 5 
            }
        }

        show(daopai=false){
            super.reorder()
            let current_pos = 0        

            if(this.wei == 0 ){
                current_pos = 20
            }else
            if(this.wei == 1){
                current_pos = 5 
            }else
            if(this.wei == 2){
                current_pos = -10

            }else{
                current_pos = -5
            }

            let that = this

            this.sentence_list.forEach( seq =>{
                //console.log("show", seq[0][0].index)
                current_pos = that.showSeq(seq[0], current_pos,seq[1], daopai)
            })

            if(daopai){
                current_pos = that.showSeq(this.laizi_list, current_pos,mjconst.SEQ_CHI, daopai)
                that.showSeq(this.pai_list, current_pos,mjconst.SEQ_CHI, daopai)
            }else{
                this.laizi_list.forEach( pai =>{
                    current_pos = pai.showMopai(that.wei, current_pos)
                    pai.model.userData.index = pai.index
                })

                this.pai_list.forEach( pai =>{
                    current_pos = pai.showMopai(that.wei, current_pos)
                    pai.model.userData.index = pai.index
                })
                this.current_pos = current_pos
            }
            mjgraph.rerender()
        }

        //把吃的牌收进来， 并做号标记
        standupForChi(){
            if (this.wei == 0){
                Object.keys(this.chi_seq_list).forEach(key => { 
                    let index_list = this.chi_seq_list[key]
                    //mjtable.logPaiList(seq)
                    let seq = mjtable.Pot.getPaiList(index_list)
                    seq[0].toggleHilight()
                    seq[1].toggleHilight()
                })       
            }
            mjgraph.rerender()     
        }

        cancelStandup(){
            if (this.wei == 0){
                Object.keys(this.chi_seq_list).forEach(key => { 
                    let index_list = this.chi_seq_list[key]
                    //mjtable.logPaiList(seq)
                    let seq = mjtable.Pot.getPaiList(index_list)
                    seq[0].toggleHilight()
                    seq[1].toggleHilight()
                })       
            }
        }
        //返回会数组, [0]表示是否是吃, [1]表示是单击还是双击
        selectForChi(index){
            if (this.chi_seq_list == mjconst.NONE){
                return false
            }       
    
            this.chi_seq_select = -1
            Object.keys(this.chi_seq_list).forEach((key) => {
                let chi_index_list = this.chi_seq_list[key]
                chi_index_list.forEach( chi_index => {
                    if( chi_index == index){
                        if(this.chi_seq_select == -1){
                            this.chi_seq_select = key
                        }else{
                            //此牌在两个组合里面,为避免歧义, 不选择任何组合
                            this.chi_seq_select = -1
                        }
                    }
                })
            })   
            return this.chi_seq_select >= 0
        }
    
        cancelSelectForChi(){
            this.selected = -1
        }
        //返回会数组, [0]表示是否是杠, [1]表示是单击还是双击
        selectForAngang(index){
            if (this.an_gang_seq_list.length == 0){
                return [false,false]
            }

            if(this.selected == index){
                //双击了
                return [this.an_gang_seq_select >= 0,true]
            }else{ //单击
                this.an_gang_seq_select = -1
                this.an_gang_seq_list.forEach((seq, seq_index) => { 
                    seq.forEach(pai => {
                        if(pai.index == index){
                            this.selected = index
                            this.an_gang_seq_select = seq_index
                            return false
                        }
                    })
                })
                if(this.an_gang_seq_select >= 0){
                    this.an_gang_seq_list[this.an_gang_seq_select].forEach(pai => {
                        pai.toggleHilight()      
                    })
                }
                return [this.an_gang_seq_select >= 0, false] 
            }           
        }
        

        cancelSelectForAngang(){
            this.selected = -1
            if(this.an_gang_seq_select >= 0){
                this.an_gang_seq_list[this.an_gang_seq_select].forEach(pai => {
                    pai.toggleHilight()      
                })
            }
            this.an_gang_seq_select = -1
        }
    }
    return {Paiyou,createPlayers}
})