define([], function () {
    class BaseDialect {

        static hasLaizi(){
            return false
        }

        static hasNews(){
            return true
        }

        static getZhuang(cur_zhuang,cur_hu){
            return cur_hu
        }

        static allowInitAction(){
            return false
        }

        static allowChi(){
            return true
        }

        static allowPeng(){
            return true
        }

        static allowMingGangForMo(){
            return true
        }
        
        static allowMingGangForDa(){
            return true
        }

        static allowAnGang(){
            return true
        }

        static onlyZimo(){
            return false
        }

        constructor(player){
            this.player = player
            this.reasons = []
            this.hu_special = false
            this.can_init_action = false
        }
      
        //乱将
        rejectSpecial(){
            return false
        }

        //将一色
        acceptSpecial(){
            this.hu_special = false
            return this.hu_special
        }

        huSpecial(){
            return this.hu_special
        }

        acceptFinal(){
            return true
        }

        winScoreBase(){
            this.reasons = ['胡牌']
            return 100
        }

        getReasons(){
            if(this.reasons.length >=0 ){
                return this.reasons.join(",")
            }else{
                return ""
            }
        }
        
        loseScore(base_score, dianpao){
            this.reasons = ['输牌']
            return base_score
        }
        allowChi(){
            return true
        }

        allowPeng(){
            return true
        }

        allowMingGangForMo(){
            return true
        }

        allowMingGangForDa(){
            return true
        }

        allowAnGang(){
            return true
        }

        allowedDapaiList(){
            return this.player.pai_list
        }

        onlyZimo(){
            return false
        }

    }
    return {BaseDialect}
})