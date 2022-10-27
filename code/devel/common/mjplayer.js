define(['./mjconst.js', './mjtable.js', './mjalgo.js', './mjutils.js'], 
function (mjconst, mjtable, mjalgo, mjutils) {
    const order_map = {0:[2,0,1],1:[0,2,1],2:[0,1,2]}  
    function createPlayers(v_table){
        let players = []
        players[0] = new Player(v_table, 0)
        players[1] = new Player(v_table, 1)
        players[2] = new Player(v_table, 2)
        players[3] = new Player(v_table, 3)
        return players
    }

    const UNORDERED = 0
    const ORDERED = 1
    const EVALUATED = 3
    const GET_PAI_MO = 0
    const GET_PAI_FA = 1
    const GET_PAI_DA = 2

    class Player  {
        constructor(table,fang){
            //不变得属性, 不需要清理
            this.table = table
            this.fang = fang
            this.wei = fang
            this.fang_name = mjutils.getFangName(fang)
            this.name = ""
            this.auto_dapai = false
            this.onseat = false
            this.dialect = false
            //一局中累计变化的属性, 开局(莫赖子后)时清理
            this.pai_list = []
            this.laizi_list = []
            this.sentence_list = []
            this.an_gang_seq_list = []
            this.sentence_shu = 0
            
            //多局累计变化,关闭牌桌清理
            this.total_score = 0
            this.detail_score = []
            this.hu_shu = 0

            //非累计变化, 随时清理
            this.pai_list_status = UNORDERED
            this.chi_seq_list = mjconst.NONE
            this.chi_seq_select = -1
            this.peng_seq = false
            this.gang_seq = false
            this.an_gang_seq_select = -1 
            this.eval_result = []
            this.chance_chi = false
            this.chance_peng = false
            this.chance_gang = false
            this.maybe_tingtou = false
            this.defered_an_gang_chance = false
            this.gang_type = -1 //0: 暗杠, 1: 明杠
            this.gang_sentence = -1 //明杠情况下, 匹配打牌区的句子
            this.gang_pai = -1 //杠的牌
            this.hu_path_index = -1
            this.hu_seq_index = -1
            this.hu_pai = null
            this.hu_mo = false
            this.hu_dapai_fang = -1
            this.tingtou_type = -1
            this.hupai_type = -1
            this.selected = -1
            this.got_laizi = null
        }

        fangToWei(fang){
            return (fang - this.fang + 4) % 4
        }

        weiToFang(wei){
            return (wei + this.fang) % 4
        }

        setDialect(dialect){
            this.dialect = dialect
        }


        reset(){
            this.pai_list = []
            this.laizi_list = []
            this.sentence_list = []
            this.an_gang_seq_list = []
            this.sentence_shu = 0
            this.eval_result = []
            this.got_laizi = null
        }

        addPai(pai, how){
            if(this.table.isLaizi(pai)){
               if(mjtable.getDebug()){
                    mjutils.Tips.show("摸到宝牌:" + pai.getFaceName())
                }
                //赖子的优先级高, 自动打牌不能打掉
                pai.priority = 0
                if(how == GET_PAI_FA){
                    this.pai_list_status = UNORDERED
                    this.laizi_list.push(pai)
                }else
                if(how == GET_PAI_MO){
                    this.pai_list.push(pai)
                    this.got_laizi = pai
                }else{
                    //别人打的赖子, 当一把牌使用
                    pai.priority = 100
                    this.pai_list.push(pai)
                    this.pai_list_status = UNORDERED    
                }
            }else{
                pai.priority = 100
                this.pai_list.push(pai)
                this.pai_list_status = UNORDERED
            }
        }

        delPai(pai){
            let index = this.pai_list.indexOf(pai)
            if(index >= 0){
                this.pai_list.splice(index, 1)
            }else{
                index = this.laizi_list.indexOf(pai)
                if(index >= 0){
                    this.laizi_list.splice(index, 1)
                }
            }
        }

        delSeq(seq, count){
            //console.log("delSeq")
            for(let i = 0; i < count; i++){
                this.delPai(seq[i])
            }
        }

        getPaiByIndex(index){
            let face =  mjtable.Pot.get(index)
            if (face == null){
                face = new mjtable.Face(index) 
                mjtable.Pot.set(index, face)
            }
            return face
        }

        fapai(index_list){
            let that = this
            //console.log("发牌给:", this.fang_name)
            index_list.forEach(function(index){
                that.addPai(that.getPaiByIndex(index), GET_PAI_FA)
            })
        }

        initAction(data){
            return this.dialect.initAction(data)
        }

        beginInitAction(want){
            return this.dialect.beginInitAction(want)
        }
        

        beginMopai(){
            this.table.clearYaopaiQuan()
            this.send(mjconst.EA_SYSTEM, mjconst.ET_MOPAI)
        }

        mopai(index){
            let pai = this.getPaiByIndex(index)
            //console.log(this.fang_name + "摸牌:", pai.getFaceName(), index)
            this.addPai(pai, GET_PAI_MO)
            this.table.setCurrentMopai(this.fang, pai)
            //this.send(mjconst.EA_SYSTEM, mjconst.ET_MOPAI_END)
            return pai
        }

        endMopai(){
            this.send(mjconst.EA_SYSTEM, mjconst.ET_MOPAI_END)
        }


        //选牌， 准备出牌， 先选中 只有自己选派。
        selectForAutoDa(mopai=false){
            this.evaluate()
            let max_priority = 0
            let max_count = 0
            this.selected = -1
            let allowed_dapai_list = this.dialect.allowedDapaiList()
            allowed_dapai_list.forEach( pai => {
                if( pai.priority > max_priority ){
                    max_priority = pai.priority
                    max_count = 0
                }else
                if( pai.priority == max_priority ){
                    max_count++
                }else{
                    max_count = 0
                }
            })
            if(mjtable.getDebug()){
                mjutils.Tips.show("选牌优先级:" + max_priority)
            }
            //console.log("选牌优先级:" + max_priority)

            let pai_for_select = []
            this.pai_list.forEach( pai => {
                if((pai.priority == max_priority)){
                    //console.log("备选牌:",pai.face)
                    if(mopai){
                        pai_for_select.push(pai)                    
                    }else
                    if(this.table.getCurrentDapai().pai.face != pai.face)
                    {
                        pai_for_select.push(pai)
                    }else
                    if(max_count == 1)
                    {
                        pai_for_select.push(pai)
                        //console.log("吃牌和备选打牌相同, 但只有一个备选")
                    }
                    else{
                        //console.log("吃牌和备选打牌相同, 放弃")
                    }
                }
            })
           if(mjtable.getDebug()){
                mjutils.Tips.show("可选打牌:"+ mjutils.getPaiList(pai_for_select))
            }
            //console.log("可选打牌:"+ mjutils.getPaiList(pai_for_select))

            let max_dapai_shu = -1
            pai_for_select.forEach( pai => {
                let current_dapaishu = this.table.getDapaiStatistic(pai.face)
                if( current_dapaishu > max_dapai_shu ){
                    max_dapai_shu = current_dapaishu
                }
            })
            if(mjtable.getDebug()){
                mjutils.Tips.show("最多打牌数:" + max_dapai_shu)
            }
            //console.log("最多打牌数:" + max_dapai_shu)

            pai_for_select.forEach( pai => {
                let current_dapaishu = this.table.getDapaiStatistic(pai.face)
                if( current_dapaishu == max_dapai_shu ){
                    this.selected = pai.index
                }
            })
            if(mjtable.getDebug()){
                mjutils.Tips.show("最终打牌:" + mjtable.Pot.get(this.selected).getFaceName())
            }
            //console.log("最终打牌:", mjtable.Pot.get(this.selected).getFaceName())
        }

        //选牌， 准备出牌， 先选中 只有自己选派。
        beginDapai(){  
            if( this.selected < 0 )  return
            let index = this.selected
            this.dapai(index)
            this.table.clearDapaiQuan()
            this.selected = -1
            this.send(mjconst.EA_OTHER, mjconst.ET_DAPAI, index)
        }

        dapai(index){   
            let current_daipai = mjtable.Pot.get(index)
            if(current_daipai == null){
                console.log("ERROR: get current daipai failed!", index)
                return
            }

            //console.log(this.fang_name + "打牌:", current_daipai.getFaceName(), index)
            this.table.setCurrentDapai(this, current_daipai)

            this.table.updateDapaiStatistic(current_daipai.face)
            this.delPai(current_daipai)
            if(this.got_laizi){                
                if(this.got_laizi != current_daipai) {
                    this.delPai(this.got_laizi)
                    this.laizi_list.push(this.got_laizi)
                }
                this.got_laizi = null
            }
            return current_daipai
        }     
        
        beginChipai(){
            if (this.chi_seq_select < 0){
                console.log("Error: no chi seq")
                return
            }
    
            let order = this.chi_seq_select
            let index_list = this.chi_seq_list[order]
    
            this.chipai(index_list, order)        

            this.table.clearYaopaiQuan()

            this.send(mjconst.EA_OTHER, mjconst.ET_CHIPAI,  [index_list,order]) 
            this.chi_seq_list = false
            this.chi_seq_select = -1
        }

        endChiPeng(){
            this.table.setDapaiQuan(this.fang)
            if(this.auto_dapai){
                this.selectForAutoDa()
                this.beginDapai()
            }
        }    

        chipai(index_list,order){
            let seq = mjtable.Pot.getPaiList(index_list)
            let ordered_seq = [seq[order_map[order][0]],seq[order_map[order][1]],
                seq[order_map[order][2]]]

            this.delSeq(seq,2)
            this.sentence_list.push([ordered_seq, mjconst.SEQ_CHI,false])
        }

        beginPengpai(){
            if (!this.peng_seq){
                console.log("Error: No peng seq.")
                return
            }

            this.pengpai(this.peng_seq)
            this.table.clearYaopaiQuan()
            this.send(mjconst.EA_OTHER, mjconst.ET_PENGPAI, this.peng_seq)
            this.peng_seq = false
        }
    
        pengpai(index_list){
            let seq = mjtable.Pot.getPaiList(index_list)
            this.delSeq(seq,2)
            this.sentence_list.push([seq, mjconst.SEQ_PENG,false])
        }

        beginDapaiMinggang(){
            if(!this.gang_seq){
                console.log("Error: no gang seq!")
                return
            }  
            this.dapaiMinggang(this.gang_seq)
            this.table.clearYaopaiQuan()
            this.send(mjconst.EA_OTHER, mjconst.ET_DAPAI_MINGGANG, this.gang_seq)
            this.gang_seq = false
        }

        endGangpai(){
            this.gang_seq = false
            //杠后不需要打牌, 但this.selected存储就备选打牌,所有要清楚掉
            this.selected = -1
            this.beginMopai()
        }

        dapaiMinggang(index_list){
            let seq = mjtable.Pot.getPaiList(index_list)
            
            this.delSeq(seq, 3)
            this.sentence_list.push([seq, mjconst.SEQ_MING_GANG,false])
        }

        beginMopaiMinggang(){
            this.mopaiMinggang(this.gang_sentence, this.gang_pai)
            this.send(mjconst.EA_OTHER, mjconst.ET_MOPAI_MINGGANG, 
                [this.gang_sentence, this.gang_pai])
        }
    
        mopaiMinggang(sentence, gang_pai_index){
            let gang_pai = mjtable.Pot.get(gang_pai_index)
            this.sentence_list[sentence][0].push(gang_pai) 
            this.sentence_list[sentence][1] = mjconst.SEQ_MING_GANG
            this.delPai(gang_pai)
        }       

        beginInstantAngang(){  
            if(!this.gang_seq){
                console.log("Error: no gang seq!")
                return
            }
            this.instantAngang(this.gang_seq)
            this.send(mjconst.EA_OTHER, mjconst.ET_INSTANT_ANGANG, this.gang_seq)
            this.gang_seq = false
        }       

        instantAngang(index_list){
            let seq = mjtable.Pot.getPaiList(index_list)
            //console.log(this.fang_name + "摸牌暗杠", mjutils.getPaiList(seq))
            this.delSeq(seq, 4)
            this.sentence_list.push([seq, mjconst.SEQ_AN_GANG,true])
        }  
        
        beginDeferedAngang(){
            if (this.an_gang_seq_list.length == 0)
                return
            let seq = this.an_gang_seq_list[this.an_gang_seq_select]

            let index_list = mjutils.getIndexList(seq)
    
            this.deferedAngang(index_list)
            this.an_gang_seq_list.splice(this.an_gang_seq_select,1)
            this.send(mjconst.EA_OTHER, mjconst.ET_DEFERED_ANGANG, index_list)        
            this.an_gang_seq_select = -1
        }       

        deferedAngang(index_list){
            let seq = mjtable.Pot.getPaiList(index_list)
            //console.log(this.fang_name + "延后暗杠", mjutils.getPaiList(seq))
            this.delSeq(seq, 4)
            this.sentence_list.push([seq,mjconst.SEQ_AN_GANG,true])
        }

        completeSentences(){
            //胡牌后不需要打牌, 但this.selected存储就备选打牌,所有要清楚掉
            //this.selected = -1
        
            this.evaluate()
            let seq_list = this.eval_result[this.hu_path_index].seq
            let path_list = this.eval_result[this.hu_path_index].path
            let triple_list = []
            let double_list = []
            let used_laizi_shu = 0
            seq_list.forEach((seq, index) => {
                switch(path_list[index]){
                case mjconst.SEQ_JIANG:
                    double_list.push([seq,mjconst.SEQ_JIANG,true])
                    break
                case mjconst.SEQ_PENG:
                    triple_list.push([seq,mjconst.SEQ_PENG,true])
                    break
                case mjconst.SEQ_SINGLE:
                    double_list.push([[seq[0], this.laizi_list[used_laizi_shu]],mjconst.SEQ_JIANG,true])
                        used_laizi_shu++
                    break
                case mjconst.SEQ_CHI:
                    triple_list.push([seq,mjconst.SEQ_CHI,true])
                    break
                case mjconst.SEQ_CHI_SIDE:
                    if((seq[1].facetype % 9) == 8){
                        //如果是8/9, 要把赖子放在前面
                        triple_list.push([[this.laizi_list[used_laizi_shu],seq[0], seq[1]],
                            mjconst.SEQ_CHI,true])
                    }else{
                        triple_list.push([[seq[0], seq[1], this.laizi_list[used_laizi_shu]],
                            mjconst.SEQ_CHI,true])
                    }
                    used_laizi_shu++
                    break
                case mjconst.SEQ_CHI_MID:              
                    triple_list.push([[seq[0], this.laizi_list[used_laizi_shu], 
                        seq[1]],mjconst.SEQ_CHI,true])
                    used_laizi_shu++
                break
                }
            })  

            let laizi_shu = this.laizi_list.length
            let remained_laizi_shu = laizi_shu - used_laizi_shu
            let double_shu = double_list.length - 1
            if(this.tingtou_type == mjconst.TING_CHI_PENG){
                if(double_shu > 0){
                    for(let i = 0; i < double_shu; i++){
                        double_list[0][0].push(this.laizi_list[used_laizi_shu])
                        double_list[0][1] = mjconst.SEQ_PENG
                        triple_list.push(double_list[0])
                        double_list.splice(0,1)
                        used_laizi_shu++
                    }
                }
                remained_laizi_shu = laizi_shu - used_laizi_shu
                if(remained_laizi_shu == 3){
                    triple_list.push([this.pai_list.slice(used_laizi_shu, used_laizi_shu + 3),
                        mjconst.SEQ_PENG,true])
                    used_laizi_shu += 3

                }else
                if(remained_laizi_shu == 2){
                    double_list.push([this.pai_list.slice(used_laizi_shu, used_laizi_shu + 2),
                        mjconst.SEQ_JIANG, true])
                    used_laizi_shu += 2
                }
            }else{
                remained_laizi_shu = laizi_shu - used_laizi_shu
                if(remained_laizi_shu == 4){
                    double_list.push([this.pai_list.slice(used_laizi_shu, used_laizi_shu + 2),
                        mjconst.SEQ_JIANG,true])
                    used_laizi_shu += 2
                    double_list.push([this.pai_list.slice(used_laizi_shu, used_laizi_shu + 2),
                        mjconst.SEQ_JIANG,true])
                    used_laizi_shu += 2

                }else
                if(remained_laizi_shu == 2){
                    double_list.push([this.pai_list.slice(used_laizi_shu, used_laizi_shu + 2),
                        mjconst.SEQ_JIANG, true])
                    used_laizi_shu += 2
                }
            }
            let sentence_list = []
            this.sentence_list.forEach( sentence_tuple =>{
                sentence_list.push(sentence_tuple)
            })

            triple_list.forEach((triple) =>{
                if(!this.hu_mo){
                    let seq = triple[0]
                    if(seq.indexOf(this.hu_pai) >= 0){
                        triple[2] = false
                    }
                }
                sentence_list.push(triple)
            })   
            double_list.forEach((double) =>{
                if(!this.hu_mo){
                    let seq = double[0]
                    if(seq.indexOf(this.hu_pai) >= 0){
                        double[2] = false
                    }
                }
                sentence_list.push(double)
            })
            return sentence_list
        }

        beginHupai(){
            //胡牌后不需要打牌, 但this.selected存储就备选打牌,所有要清楚掉
            this.selected = -1

            //console.log(this.fang_name + "胡牌")
            if(this.dialect.huSpecial()){
                //console.log("beginHupai, huSpecial", )
                this.sentence_list = [[this.pai_list, mjconst.SEQ_SPECIAL, this.hu_mo]]
                this.tingtou_type = mjconst.TING_CHI_PENG
            }else{
                if(this.hu_mo){
                    if(this.got_laizi){
                        this.laizi_list.push(this.got_laizi)
                        this.pai_list.pop()
                    }
                }else{
                    this.pai_list.push(this.hu_pai)
                    this.pai_list_status = UNORDERED
                }
                this.sentence_list = this.completeSentences()
            }
            let base_score = this.dialect.winScoreBase()
            let reasons = {}
            reasons[this.fang] =  this.dialect.getReasons()
            this.hupai_type = mjutils.getHupaiType(this.tingtou_type, this.hu_mo)
            let hupai_info = {
                    zimo: this.hu_mo, 
                    tingtou_type: this.tingtou_type,
                    hupai_type: this.hupai_type,
                    dianpao_fang: this.hu_dapai_fang,
                    hupai_fang: this.fang,
                    scores: {},
                    reasons,base_score
            }
            let sentence_index_list = []
            this.sentence_list.forEach((sentence) =>{
                sentence_index_list.push([mjutils.getIndexList(sentence[0]),sentence[1],sentence[2]]) 
            })
            this.hupai({sentence_list: sentence_index_list, hupai_info})
            this.send(mjconst.EA_OTHER, mjconst.ET_HUPAI, {
                sentence_list: sentence_index_list, hupai_info})
        }

        hupai(data){
            this.table.forEachPlayer( player => {
                if(player == this){
                    let sentence_list = []
                    data.sentence_list.forEach( seq => { sentence_list.push(
                        [mjtable.Pot.getPaiList(seq[0]),seq[1],seq[2]])
                    })
    
                    player.sentence_list = sentence_list
                    player.hu_shu++
                }else{
                    if(player.laizi_list.length > 0){
                        player.sentence_list.push([player.laizi_list, -1,true])
                    }
                    if(player.pai_list.length > 0){
                        player.sentence_list.push([player.pai_list, -1,true])
                    }           
                }
                player.pai_list = []
                player.laizi_list = []
            })
        }
        
        reorder(){
            if(this.pai_list_status == ORDERED || this.pai_list_status == EVALUATED){
                return
            }

            this.pai_list.sort((a,b) =>{
                let d = a.face - b.face
                if(d == 0) {
                    return a.index - b.index
                }
                return d
            })

            this.pai_list_status = ORDERED
        }
        
        evaluate(){
            if(this.pai_list_status == EVALUATED){
                return
            }else
            if(this.pai_list_status == UNORDERED) {
                this.reorder()
            }

            this.eval_result = []
            this.chance_chi = false
            this.chance_peng = false
            this.chance_gang = false
            this.defered_an_gang_chance = false
            this.maybe_tingtou = false
            this.an_gang_seq_list = []

            let total_path=[]
            let total_data=[]
            let this_path=[]
            let this_data=[]
            let total_score = []
            mjalgo.searchChiPengJiang(this.pai_list, total_path, total_data, total_score,this_path, 
                this_data, 0, 0)
            let unique_scores = []
            total_path.forEach((path, index1) => {
                let chi_shu = 0
                let dui_shu = 0
                let peng_shu = 0
                let chi_zui_shu = 0
                let single_shu = 0 
                let an_gang_seq_list = []
                let an_gang_shu = 0
                let tingpai_list = []
                let seq
                if (unique_scores.indexOf(total_score[index1]) >=0 ){
                    return false
                }else{
                    unique_scores.push(total_score[index1])
                }
        
                path.forEach((path_type, index2) => {
                    seq = total_data[index1][index2]
                    seq.forEach(pai =>
                        {if(path_type < pai.priority){
                            pai.priority = path_type}
                        }
                    )
                    switch(path_type){
                    case mjconst.SEQ_CHI: 
                        chi_shu++; 
                        tingpai_list.push(mjconst.NONE);  
                        break
                    case mjconst.SEQ_PENG: 
                        peng_shu++; 
                        tingpai_list.push(mjconst.NONE); 
                        break
                    case mjconst.SEQ_JIANG: 
                        dui_shu++; 
                        tingpai_list.push([seq[0].face]); 
                        break
                    case mjconst.SEQ_CHI_SIDE: 
                        chi_zui_shu++;
                        tingpai_list.push([seq[0].face - 1, seq[1].face + 1]); 
                        break
                    case mjconst.SEQ_CHI_MID: 
                        chi_zui_shu++
                        tingpai_list.push([seq[0].face + 1]); 
                        break
                    case mjconst.SEQ_SINGLE: 
                        single_shu++; 
                        tingpai_list.push([seq[0].face]); 
                        break
                    case mjconst.SEQ_AN_GANG: 
                        an_gang_shu++; 
                        tingpai_list.push(mjconst.NONE); 
                        an_gang_seq_list.push(seq)
                    }
                })

                let maybe_tingtou = (chi_zui_shu + single_shu) <= (this.laizi_list.length +1)
                let chance_chi = chi_zui_shu > 0
                let chance_peng = dui_shu > 0
                let chance_gang =  peng_shu > 0

                this.maybe_tingtou = this.maybe_tingtou || maybe_tingtou
                this.chance_chi = this.chance_chi || chance_chi
                this.chance_peng = this.chance_peng || chance_peng
                this.chance_gang = this.chance_gang || chance_gang
                
                an_gang_seq_list.forEach(seq => {
                    this.defered_an_gang_chance = true
                    switch(this.an_gang_seq_list.length){
                        case 3:
                            if(this.an_gang_seq_list[2][0].face == seq[0].face){
                                return false
                            }
                        case 2:
                            if(this.an_gang_seq_list[1][0].face == seq[0].face){
                                return false
                            }
                        case 1:
                            if(this.an_gang_seq_list[0][0].face == seq[0].face){
                                return false
                            }
                        case 0:
                            this.an_gang_seq_list.push(seq)
                            break
                    }
                })
                this.eval_result.push({
                    chi_zui_shu: chi_zui_shu,
                    dui_shu: dui_shu,
                    chi_shu: chi_shu,
                    peng_shu: peng_shu,
                    single_shu: single_shu,
                    want_list: tingpai_list, 
                    path: total_path[index1],
                    score: total_score[index1],
                    an_gang_seq_list: an_gang_seq_list,
                    an_gang_shu:an_gang_shu,
                    seq: total_data[index1],
                    maybe_tingtou: maybe_tingtou,
                    chance_chi: chance_chi,
                    chance_peng: chance_peng,
                    chance_gang: chance_gang
                })
            })    
            this.pai_list_status == EVALUATED
        }

        logEvalResult(filter){
            this.eval_result.forEach( (res,index) => {
                if(filter == "tingtou"){
                    if(! res.maybe_tingtou){
                        return false
                    }
                }
                console.log("Result Path: ", index)
                let info = {
                    chance_chi: res.chance_chi, 
                    chance_peng: res.chance_peng,
                    chance_gang: res.chance_gang,
                    maybe_tingtou: res.maybe_tingtou,
                    chi_zui_shu: res.chi_zui_shu,
                    dui_shu: res.dui_shu,
                    chi_shu: res.chi_shu,
                    peng_shu: res.peng_shu,
                    single_shu: res.single_shu,
                }
                console.log("total info:", info)
                console.log("want pai:", res.want_list)
                console.log("seq path:",res.path)
                console.log("score: ", res.score)
                res.seq.forEach(seq => {
                    console.log(mjutils.getPaiList(seq))
                })
            }) 
        }

        calcMopai(){
            let pai = this.table.getCurrentMopai().pai
            let can_gang = this.calcMingGangForMo(pai)
            if(!can_gang){
                can_gang =  this.calcAnGang(pai)
            }
            let can_hu = this.calcHuForMo(pai)
            return {can_gang, can_hu}
        }

        calcDapai(dapai_tuple){
            let dapai =  dapai_tuple.pai
            let dapai_fang = dapai_tuple.player.fang
            let can_chi = null
            let can_peng = this.calcPeng(dapai)
            let can_gang = this.calcMingGangForDa(dapai)
            let can_hu = this.calcHuForDa(dapai, dapai_fang)

            let dapai_wei = this.fangToWei(dapai_fang)
            if (dapai_wei == 3){
                //上家打的牌,判断能不能吃
                can_chi = this.calcChi(dapai)
            }
            return {can_chi,can_peng,can_gang,can_hu}
        }

        calcChi(face){
            //如果规则不允许吃牌, 则返回false
            if(!this.table.dialect.allowChi() || !this.dialect.allowChi()){
                return false
            }
            this.evaluate()
            if (!this.chance_chi) {
                this.chi_seq_list = mjconst.NONE
                return false
            }
            this.chi_seq_list ={}
            this.chi_seq_select = -1
            let can_chi = false
            this.eval_result.forEach( res => {
                if(!res.chance_chi){
                    return false
                }
                let want_list = res.want_list
                let path = res.path
                let data = res.seq
                want_list.forEach((want_options,index2) => {
                    let zui = data[index2]
                    let path_type = path[index2]
                    want_options.forEach((option,index3) => {
                        if( option == face.face){                     
                            if(path_type == mjconst.SEQ_CHI_SIDE){
                                can_chi = true
                                if(index3 == 0){
                                    if(this.chi_seq_list[0] == null){
                                        this.chi_seq_list[0] = [zui[0].index, zui[1].index,face.index]
                                        this.chi_seq_select = 0
                                    }else
                                    if(zui[0].index > this.chi_seq_list[0][0]){
                                        this.chi_seq_list[0] = [zui[0].index, zui[1].index,face.index]
                                    }                                          
                                }else{
                                        this.chi_seq_list[2] = [zui[0].index, zui[1].index, face.index]
                                        this.chi_seq_select = 2
                                }
                            }else
                            if(path_type == mjconst.SEQ_CHI_MID){
                                can_chi = true
                                if(this.chi_seq_list[1] == null){
                                    this.chi_seq_list[1] = [zui[0].index, zui[1].index,face.index]
                                    this.chi_seq_select = 1
                                }else
                                if(zui[0].index > this.chi_seq_list[1][0]){
                                    this.chi_seq_list[1] = [zui[0].index, zui[1].index,face.index]                                
                                }
                            }
                        }
                    })

                })
            })
            let chi_list_length = Object.keys(this.chi_seq_list).length
            if(chi_list_length == 1){
                //还需要检查一下, 是否存在吃完牌后,还有相同的孤牌
                let zui = this.chi_seq_list[this.chi_seq_select]
                let zui_type = mjtable.Pot.get(zui[0]).type
                let same_type_list = [{face: -1000}]
                this.pai_list.forEach( pai => {
                    if(pai.type == zui_type){
                        if(pai.index != zui[0] && pai.index != zui[1]){
                            same_type_list.push(pai) 
                        }
                    }
                })
                let face_index_in_list = -1
                let face_count_in_list = 0
                same_type_list.forEach( (pai,index) => {
                    if(pai.face == face.face){
                        face_index_in_list = index   
                        face_count_in_list++
                    }
                })
    
                if(face_count_in_list == 1){
                    same_type_list.push({face: 1000})                
                    let test_list = [
                        same_type_list[face_index_in_list - 1],
                        same_type_list[face_index_in_list],
                        same_type_list[face_index_in_list + 1]
                    ]

                    let chi_result = mjalgo.testChi(test_list)
                    let peng_result = mjalgo.testPeng(test_list)   
                    if(chi_result == -1 &&  peng_result == -1){
                       if(mjtable.getDebug()){
                            mjutils.Tips.show("吃牌后成孤牌!")
                        }
                        can_chi = false
                    }
                }
            }
            if(! can_chi){
                this.selected = -1
                this.chi_seq_list ={}
                this.chi_seq_select = -1
            }
            return can_chi
        }

        calcPeng(face){
            //如果规则不允许吃牌, 则返回false
            if(!this.table.dialect.allowPeng() || !this.dialect.allowPeng()){
                return false
            }            
            this.evaluate()
            if (!this.chance_peng) {
                return false
            }                   
            let can_peng = false
            this.peng_seq = false
            this.eval_result.forEach( res => {
                if(!res.chance_peng){
                    return false
                }
                let want_list = res.want_list
                let path = res.path
                let data = res.seq
                want_list.forEach((want_options,index) => {
                    let zui = data[index]
                    let path_type = path[index]
                    want_options.forEach((option) => {
                        if( option == face.face){
                            if(path_type == mjconst.SEQ_JIANG){
                                can_peng = true
                                this.peng_seq = [zui[0].index, zui[1].index, face.index]
                                return false                            
                            }

                        }
                    })

                })  
            })
            return can_peng
        }

        calcAnGang(face){
            if(!this.table.dialect.allowAnGang() || !this.dialect.allowAnGang()){
                return false
            }            

            //摸牌前已经evaluate,这里就不需要了
            return this.calcGang(face, true)
        }

        calcMingGangForDa(face){
            if(!this.table.dialect.allowMingGangForDa() || !this.dialect.allowMingGangForDa()){
                return false
            }            

            this.evaluate()
            return this.calcGang(face, false)
        }

        calcGang(face, mo){
            if (!this.chance_gang) {
                return false
            }

            let can_gang = false
            this.eval_result.forEach( res => {
                if(!res.chance_gang){
                    return false
                }
                let path = res.path
                let data = res.seq
                path.forEach((seq_type,index2) => {
                    let zui = data[index2]
                    if(seq_type == mjconst.SEQ_PENG){
                        if(face.face == zui[0].face){
                            can_gang = true
                            this.gang_seq = [zui[0].index, zui[1].index, zui[2].index, face.index]
                            return false        
                        }
                    }
                })  
            })
            if(can_gang){
                if(mo){
                    this.gang_type = mjconst.GT_ANGANG//暗杠
                    //this.an_gang_seq_list.push(this.gang_seq)
                }else{
                    this.gang_type = mjconst.GT_DAPAI_MINGGANG//明杠
                }
            }else{
                this.gang_type = mjconst.GT_NO_GANG//无杠  
                this.gang_seq = false  
            }             
            return can_gang
        }

        calcMingGangForMo(pai){
            if(!this.table.dialect.allowMingGangForMo() || !this.dialect.allowMingGangForMo()){
                return false
            }            

            let can_gang = false
            this.gang_sentence = -1
            this.sentence_list.forEach( (seq_info,index) => {
                let triple = seq_info[0]
                let seq_type = seq_info[1] 
                if(seq_type == mjconst.SEQ_PENG){
                    if(pai.face == triple[0].face){
                        can_gang = true
                        this.gang_sentence = index
                    }
                }
            })
            if(can_gang){
                this.gang_type = mjconst.GT_MOPAI_MINGGANG//明杠
                this.gang_pai= pai.index
            }else{
                this.gang_type = mjconst.GT_NO_GANG //无杠       
            }   
            return can_gang
        }
        
        verifyHu(result){
            let pai_shu = this.pai_list.length
            let chi_zui_shu = result.chi_zui_shu
            let dui_shu = result.dui_shu
            let single_shu = result.single_shu
            let laizi_shu = this.laizi_list.length
            let chi_shu = result.chi_shu
            let peng_shu = result.peng_shu
            let an_gang_shu = result.an_gang_shu
            let semi_double_shu = single_shu + dui_shu
            let semi_triple_shu = chi_shu + peng_shu + an_gang_shu + chi_zui_shu
            let is_hupai = false
            let tingtou_type = mjconst.TING_CHI_PENG

            if((pai_shu + laizi_shu)== 14 && semi_triple_shu == 0){
                is_hupai = laizi_shu >= single_shu
                tingtou_type = mjconst.TING_7_DUI
            }else
            if(semi_double_shu == 0){
                is_hupai = (laizi_shu == chi_zui_shu + 2)
            }else{
                is_hupai = (laizi_shu == (chi_zui_shu + dui_shu + 2*single_shu - 1)) || 
                    (laizi_shu == (chi_zui_shu + dui_shu + 2*single_shu + 2))
            }
            return [is_hupai, tingtou_type]
        }

        calcHuForMo(face){
            let can_hu
            if(this.got_laizi){
                this.laizi_list.push(this.got_laizi)
                this.pai_list.pop()
                can_hu = this.calcHu(face)
                this.laizi_list.pop()
                this.got_laizi.priority = 0
                this.pai_list.push(this.got_laizi)
            }else{
                can_hu = this.calcHu(face)
            }
            this.hu_mo = true
            this.hu_dapai_fang = -1
            return can_hu
        }

        calcHuForDa(face,dapai_fang){
            if(this.table.dialect.onlyZimo() || this.dialect.onlyZimo()){
                return false
            }
            
            this.addPai(face, GET_PAI_DA)
            let can_hu = this.calcHu(face)
            this.hu_mo = false
            this.hu_dapai_fang = dapai_fang
            this.delPai(face)
            return can_hu
        }

        calcHu(face){
            let can_hu = false
            this.hu_path_index = -1
            this.hu_pai = null

            this.evaluate()
            if (! this.maybe_tingtou) {
                return false
            }        

            for (let i = 0; i < this.eval_result.length; i++) {
                let res = this.eval_result[i]
                if (! res.maybe_tingtou) {
                    continue
                }
                let hu = this.verifyHu(res)
                if(hu[0]){
                    //console.log("胡牌, 判断258将,")
                    this.hu_path_index = i
                    this.hu_pai = face
                    this.tingtou_type = hu[1]    

                    if(! this.dialect.rejectSpecial()){                                       
                        can_hu = true
                        break
                    }
                }
            }
            if(! can_hu){
                let special_res = this.dialect.acceptSpecial()
                if(special_res){
                    console.log("acceptSpecial......")            
                    can_hu = true
                }
            }
            return can_hu
        }
        
        send(event_sink, event_type, event_body=false){
            this.table.send(this.fang, event_sink, event_type, event_body)
        }

    }
    return {Player,createPlayers}
})