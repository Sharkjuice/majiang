define(['../common/mjconst.js', './mjdialect_base.js'], function (mjconst,mjdialect_base) {
    class SimpleDialect extends mjdialect_base.BaseDialect{
        static create(player){
            return new SimpleDialect(player)
        }
        static name(){
            return "无宝乱将"
        }

        constructor(player){
            super(player)
        }
      
        static getDoc(){
            return "规则:无宝;乱将;轮庄;无大胡;暗杠/点炮加倍"
        }

        //最后决定时否胡牌
        winScoreBase(){
            this.reasons = []
            let win_fan = 0
            this.player.sentence_list.forEach( sentence_tuple =>{
                if(sentence_tuple[1] == mjconst.SEQ_AN_GANG){
                    win_fan++
                    this.reasons.push("暗杠")
                }
            })
            if(win_fan == 0){
                this.reasons.push("小胡")
            }
            //this.base_score = 100*(2**win_fan)
            return 100*(2**win_fan)
        }

        
        loseScore(base_score, dianpao){
            this.reasons = []
            let lose_fan = 0
            this.player.sentence_list.forEach( sentence_tuple =>{
                if(sentence_tuple[1] == mjconst.SEQ_AN_GANG){
                    this.reasons.push("暗杠")
                    lose_fan++
                }
            })
            if(this.player.table.isZhuang(this.player)){
                this.reasons.push("庄家")
                lose_fan++
            }
            if(this.player.fang == dianpao){
                lose_fan++
                this.reasons.push("点炮")
            }
            if(this.reasons.length == 0){
                this.reasons.push("小输")  
            }
            return base_score*(2**lose_fan)
        }
    }
    return SimpleDialect    

})