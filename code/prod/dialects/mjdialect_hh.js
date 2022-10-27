define(['../common/mjconst.js', './mjdialect_base.js', '../common/mjutils.js', '../common/mjtable.js'], 
function (mjconst, mjdialect_base, mjutils, mjtable) {
    class HuanghuangDialect extends mjdialect_base.BaseDialect{
        static create(player){
            return new HuanghuangDialect(player)
        }
        static name(){
            return "晃晃"
        }
        static hasLaizi(){
            return true
        }

        static hasNews(){
            return false
        }

        static allowInitAction(){
            return true
        }

        checkInitAction(){
            this.zhongfabai = [false,false,false]
            let count = 0
            this.player.pai_list.forEach( pai => {
                if(pai.type == 3 && !this.zhongfabai[0]){
                    this.zhongfabai[0] = pai
                    count++
                }else
                if(pai.type == 4 && !this.zhongfabai[1]){
                    this.zhongfabai[1] = pai
                    count++
                }else
                if(pai.type == 9 && !this.zhongfabai[2]){
                    this.zhongfabai[2] = pai
                    count++
                }
            });
            this.can_init_action = (count == 3)
            return this.can_init_action
        }

        static initActionName(){
            return "中发白"
        }

        beginInitAction(want_init_action){
            if(this.can_init_action && want_init_action){
                this.player.sentence_list.push([this.zhongfabai, mjconst.SEQ_CHI, true])
                this.player.delSeq(this.zhongfabai, 3)
                let index_list = mjutils.getIndexList(this.zhongfabai)
                this.player.send(mjconst.EA_OTHER, mjconst.ET_INIT_ACTION, index_list)
                return true
            }
            else{
                this.player.send(mjconst.EA_SYSTEM, mjconst.ET_INIT_ACTION)
                return false
            }
        }
        initAction(data){
            let seq = mjtable.Pot.getPaiList(data)
            this.player.delSeq(seq,3)
            this.player.sentence_list.push([seq, mjconst.SEQ_CHI,true])
            return true          
        }


        static getDoc(){
            return "规则: 有宝;乱将;无东南西北风;清一色/自摸/无宝/点炮加倍"
        }

        constructor(player){
            super(player)
            this.dahu_list = []
            this.zhongfabai = []
            this.can_init_action = false
        }

        getType(sentence_tuple){
            let sentence = sentence_tuple[0]
            let type = -1      
            sentence.forEach(pai => {
              if(this.player.table.isLaizi(pai)){
                  return false 
              }
              type = pai.type
            })
            return type
          }
    
        calcQingyise(){
            let type = -1
            let result = true
            this.player.sentence_list.forEach( sentence_tuple => {
                //console.log(sentence_tuple)
              let cur_type = this.getType(sentence_tuple)
              if(cur_type == -1){
                  return false
              }
              if(type == -1){
                  type = cur_type
              }else
              if(type != cur_type){
                  result = false
              }      
            })

            if(result){
                this.dahu = '清一色'
            }
        }
      

        //计算大胡
        computeDahu(){
            this.dahu = ""
            this.calcQingyise()
        }

        //最后决定时否胡牌
        winScoreBase(){
            this.computeDahu()
            this.reasons = []
            let win_fan = 0
            if(this.player.laizi_list.length == 0){
                win_fan++
                this.reasons.push("无宝")
            }
            if(!!this.dahu){
                win_fan++
                this.reasons.push(this.dahu)
            }
            if(this.player.hu_mo){
                win_fan++
                this.reasons.push("自摸")
            }
            if(this.player.tingtou_type == mjconst.TING_7_DUI){
                win_fan++
                this.reasons.push("7对")
            }
            if(this.reasons.length == 0){
                this.reasons.push("小胡")
            }

            //this.base_score = 100*(2**win_fan)
            return 100*(2**win_fan)
        }

        getReasons(){
            if(this.reasons.length >=0 ){
                return this.reasons.join(",")
            }else{
                return ""
            }
        }
        
        loseScore(base_score, dianpao){
            this.reasons = []
            let lose_fan = 0
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
    return HuanghuangDialect
})