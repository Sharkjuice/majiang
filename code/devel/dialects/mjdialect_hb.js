define(['../common/mjconst.js', './mjdialect_base.js'], function (mjconst, mjdialect_base) {
    class HubeiDialect extends mjdialect_base.BaseDialect{
        static create(player){
            return new HubeiDialect(player)
        }
        static name(){
            return "258将"
        }
        static hasLaizi(){
            return true
        }

        static hasNews(){
            return true
        }

        static getZhuang(cur_zhuang,cur_hu){
            if(cur_zhuang == cur_hu){
                return cur_zhuang
            }else{
                return (cur_zhuang+1)%4
            }
        }

        static getDoc(){
            return "规则: 有宝;258将;清一色/碰碰胡/门前清/豪华7对/全求人/报听;暗杠/无宝/点炮加倍"
        }


        constructor(player){
            super(player)
            this.dahu_list = []
            this.baozi = false
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
    
        getFace(sentence_tuple){
            let sentence = sentence_tuple[0]
            let face = -1      
            sentence.forEach(pai => {
              if(this.player.table.isLaizi(pai)){
                  return false 
              }
              face = pai.face
            })
            return face
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
                this.dahu_list.push('清一色')
            }
        }
      
        calcPengpenghu(){
          let result = true
          this.player.sentence_list.forEach( sentence_tuple => {
              let cur_seqtype = sentence_tuple[1]
              if(cur_seqtype == mjconst.SEQ_CHI){
                  result = false
              }
          });
          if(result){
            this.dahu_list.push('碰碰胡')
          }
        }
      
        calcMengqianqing(){
          let result = true
          this.player.sentence_list.forEach( sentence_tuple => {
              let cur_motype = sentence_tuple[2]
              if(!cur_motype){
                  result = false
              }
          });

          if(result){
            this.dahu_list.push('门前清')
          }      
        }
        calcHaohua7dui(){
          let face = -1
          this.player.sentence_list.forEach( sentence_tuple => {
              let cur_face = this.getFace(sentence_tuple)
              //console.log("pre",face,"cur",cur_face)
              if(cur_face == -1){
                  return false
              }
              if(face == -1){
                  face = cur_face
              }else
              if(face == cur_face){
                  this.dahu_list.push('豪华七对')
              }else{
                  face = cur_face
              } 
          });
        }
      
        calcQuanqiuren(){
          let result = true
          this.player.sentence_list.forEach( sentence_tuple => {
              let cur_motype = sentence_tuple[2]
              if(cur_motype){
                  result = false
              }
          });
          if(result){
            this.dahu_list.push('全求人')
          }
        }      

        calcJiangyise(){
            let result = false
            this.player.sentence_list.forEach( sentence_tuple => {
                let cur_paitype = sentence_tuple[1]
                if(cur_paitype == mjconst.SEQ_SPECIAL){
                    result = true
                    return false
                }
            });
            if(result){
              this.dahu_list.push('将一色')
            }
          }
          
        //258定将才能胡牌
        rejectSpecial(){
            if(this.tingtou_type == mjconst.TING_7_DUI){
                //胡牌7对的话,不用管258将
                return false
            }
            let result = false
            let sentence_list = this.player.completeSentences()
            //console.log(mjutil.getPaiList(double))
            // sentence_list.forEach( sentence_tuple => {
            //     if(sentence_tuple[1] != mjconst.SEQ_JIANG){
            //         return false
            //     }
            sentence_list[4][0].forEach( pai => {
                if(!this.player.table.isLaizi(pai)){
                    if(pai.type > 2){
                        result = true
                    }
                    console.log('rejectSpecial', (pai.index % 9) % 3)
                    if(((pai.index % 9) % 3) != 1){
                        result = true
                    }
                }
            })
            return result
        }

        //将一色
        acceptSpecial(){
            this.hu_special = false
            if(this.player.pai_list.length < 14){
                return this.hu_special
            }
            this.player.pai_list.forEach( pai => {
                if(this.player.table.isLaizi(pai)){
                    return false 
                }  
                let ab_face = (pai.index % 9) % 3
                if(ab_face != 1){
                    this.hu_special = false
                    return false
                }
            });
            this.hu_special
            return this.hu_special
        }

        huSpecial(){
            return this.hu_special
        }


        //计算大胡
        computeDahu(){
            this.dahu_list = []
            if(this.huSpecial()){
                this.calcJiangyise()
            }else
            if( this.tingtou_type == mjconst.TING_7_DUI){
                this.calcHaohua7dui()
                this.calcQingyise()
                this.calcJiangyise()
            }else{
                this.calcQingyise()
                this.calcMengqianqing()
                this.calcPengpenghu()
                this.calcQuanqiuren()
            }
        }

        acceptFinal(){
            //两个宝不能胡小胡
            if(this.player.laizi_list.length >= 2 && this.dahu.length == 0){
                this.reasons = ["2宝不能胡小胡"]
                return false
            }
            return true

        }

        static allowInitAction(){
            return true
        }

        static initActionName(){
            return "豹子"
        }

        checkInitAction(){
            this.can_action = false
            this.player.evaluate()
            if(this.player.maybe_tingtou){
                console.log("checkInitAction", true)
                this.can_action = true
            }
            return this.can_action
        }

        beginInitAction(want){
            if(this.can_action && want){
                this.baozi = true
                this.player.send(mjconst.EA_OTHER, mjconst.ET_INIT_ACTION, true)
                this.dahu_list.push('豹子')
            }
            else{
                this.baozi = false
                this.player.send(mjconst.EA_SYSTEM, mjconst.ET_INIT_ACTION)
            }
            return this.baozi
        }
        initAction(data){
            return false
        }

        getAllowedDapaiList(mo){
            if(this.baizi){
                return [this.table.getCurrentMopai().pai]
            }else{
                return this.player.pai_list
            }
        }


        allowChi(){
            return !this.baozi
        }

        allowPeng(){
            return !this.baozi
        }

        onlyZimo(){
            return this.baozi
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
            if(this.dahu_list.length == 0){
                this.reasons.push("小胡")
            }else{
                this.dahu_list.forEach( dahu => {
                    win_fan++
                    this.reasons.push(dahu)
                })
            }
            this.player.sentence_list.forEach( sentence_tuple =>{
                if(sentence_tuple[1] == mjconst.SEQ_AN_GANG){
                    win_fan++
                    this.reasons.push("暗杠")
                }
            })
            if(this.player.hu_mo){
                win_fan++
                this.reasons.push("自摸")
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

    return HubeiDialect
})