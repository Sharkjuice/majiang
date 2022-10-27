define(["./mjconst.js"], function (mjconst) {
    let debug_mode = false
    function setDebug(){
        debug_mode = true
    }
    function getDebug(){
        return debug_mode
    }

    class Face{
        static face_char_map = ['z','x','c','v','b','n','m','<','>',
        'a','s','d','f','g','h','j','k','l',
        'q','w','e','r','t','y','u','i','o',
        //中/發/東/南/西/北/白板
        '\ue805','\ue806','\ue801','\ue802','\ue803','\ue804','\ue807'
        ]

        //index: 136只麻将牌的编号, 从0开始到135,按筒/条/万/中/發/東/南/西/北/白板的顺序
        //type:  牌的花色:筒/条/万/中/發/東/南/西/北/白板, 从0到9
        //facetype: 表达牌面的数值, 如1万,3条, 四个一万的face是相同的,连续排序, 从0到35
        //face: 表达牌面的数值, 如1万,3条, 四个一万的face是相同的, 但不是连续排序, 在同花色内连续, 
        //不同花色不连续, 比如一筒到九筒是0到8, 一条到9条是11到19, 计算吃碰杠用到
        constructor(index){
            this.valid = true
            if(index < 0){
                this.valid = false
            }else{
                let type = Math.floor(index/36)
                let residule = index%36
                let face, facetype
                if (index < 108){
                    face = residule%9
                    facetype = type*9 + face
                    face = type*10 + face + type
                }else{
                    face = Math.floor(residule/4)
                    facetype = type*9 + face
                    type += face
                    face = type*10 + type
                }
                this.type = type
                this.face = face
                this.facetype = facetype
                this.index = index
                this.priority = 100
            }
        }
        
        getFontChar(){
            return Face.face_char_map[this.facetype]
        }
        getFontCharEx(){
            let char = Face.face_char_map[this.facetype]
            if(char =="<")
                return "&lt"
            else
            if(char == ">")
                return "&gt"
            else
                return char
        }

        getFaceName(){
            let face_name = ""
            let face_num_str = (this.facetype)%9 + 1
            switch (this.type){
                case -1: 
                    console.log("Error: getFaceName, face type is -1")
                    face_name = "无效牌"; 
                    break
                case 0: face_name = face_num_str + "筒"; break
                case 1: face_name = face_num_str + "条"; break
                case 2: face_name = face_num_str + "萬"; break
                case 3: face_name = "红中"; break
                case 4: face_name = "發財"; break
                case 5: face_name = "東風"; break
                case 6: face_name = "南風"; break
                case 7: face_name = "西風"; break
                case 8: face_name = "北風"; break
                case 9: face_name = "白板"; break
            }
            return face_name
        }
    }    
    //Pai on the table
    class Pot{
        static cache = {}
        static getPaiList(index_list){
            let pai_list = []
            index_list.forEach( index => {
                pai_list.push(this.get(index))
            })
            return pai_list    
        }
        
        static get(index){
            return this.cache[index]
        }
        
        static set(index,pai){
            if(pai == null){
                console.log("save pai: invalid pai!")
                return 
            }
            this.cache[index] = pai
        }
        static hideAll(){
            Object.keys(this.cache).forEach(key => {
                this.cache[key].setVisible(false)
            })
        }
    }

    class Laizi extends Face{
        constructor(index){
            super(index)
        }
        show(){
            if( this.valid){
                $("#button_laizi").text(this.getFontChar())
                $("#button_laizi").show()
            }
        }
        hide(){
            $("#button_laizi").hide()
        }
    }

    class Table  {
        static dialect_list = {}
        static table_list = {}
        static default_table_id = -1        
    
        static create(table_id,client_id,table_info){
            let new_paizhuo = new Table(table_id, client_id,table_info)
            this.table_list[table_id] = new_paizhuo
            return new_paizhuo
        }
        
        static get(table_id){
            return this.table_list[table_id]
        }
    
        static getDefault(){
            if(this.default_table_id < 0){
                return null
            }else{
                return this.table_list[this.default_table_id]
            }
        }
    
        static setDefault(table_id){
            this.default_table_id = table_id
        }

        static setDialect(name, dialect){
            this.dialect_list[name] = dialect
        }

        static getDialect(name){
            return this.dialect_list[name]
        }

    
        constructor(table_id, client_id, info){
            //牌桌路由信息
            this.table_id = table_id
            this.client_id = client_id
            //打牌信息
            this.zhuangjia = 0
            this.owner = 0
            this.wei_players = []
            this.fang_players = []
            this.status =  mjconst.PS_EMPTY
            this.current_dapai = null
            this.current_dapai_fang = -1
            this.current_mopai = null
            this.current_mopai_fang = -1
            this.dapai_quan = -1
            this.yaopai_quan = -1
            this.ju_shu = 0
            this.connection = null
            this.laizi =  new Laizi(-1)  //无效牌, 没有赖子的时候使用
            this.dice_num = -1
            this.dapai_statistics = {}
            this.history = []
            //其他信息
            this.robot_shu = 0
            this.player_shu = 0
            this.start_time = info.start_time
            this.dialect_name = info.dialect_name
            this.table_name = info.table_name
            this.table_route = info.table_route
            console.log("constructor, max_ju", info.max_ju)
            this.max_ju = info.max_ju
            this.room_id = Math.floor(info.table_route/100)
            this.dialect = Table.getDialect(info.dialect_name)
        }

        join(msg){
            let player_info = msg.body[0]
            let table = Table.get(msg.table_id)
        
            let paiyou = table.getPlayerByFang(msg.source)
            if(msg.client_id == table.client_id){
                paiyou.onseat = true    
            }
            paiyou.name = player_info.name
            paiyou.auto_dapai = player_info.auto_dapai
            paiyou.player_type = player_info.player_type
            if(player_info.player_type == mjconst.ROBOT_PLAYER){
                this.robot_shu++
            }
            this.player_shu++
            return paiyou
        }

        setPlayers(players){
            this.fang_players = players
            this.forEachPlayer(player => {
                player.setDialect(this.dialect.create(player))
            })
        }

        rotatePlayers(fang){
            for(let i = 0; i < 4; i++){
                let wei = (i + 4 - fang)%4
                this.wei_players[wei] = this.fang_players[i]
                this.wei_players[wei].wei = wei
            }
        }

        getPlayerByFang(fang){
            return this.fang_players[fang]
        }

        getPlayerByWei(wei){
            return this.wei_players[wei]
        }

        getDefaultPlayer(){
            return this.wei_players[0]
        }

        getNextPlayer(player){
            return this.fang_players[(player.fang+1)%4]
        }

        forEachPlayer(func){
            this.fang_players.forEach(func)
        }

        isLaizi(pai){
            return pai.face == this.laizi.face
        }
        
        setDiceAndLaizi(dice, laizi){
            this.laizi = new Laizi(laizi)
            this.dice_num = dice
        }

        close(){
            console.log("mjtable table close")
            this.zhuangjia = 0
            this.status = mjconst.PS_EMPTY
            this.ju_shu = 0
            this.forEachPlayer(player => {
                player.reset()
            })
            this.fang_players = []
            this.wei_players = []
            delete(Table.table_list[this.table_id])
            this.table_id  = -1
            this.history = []
            this.dapai_history = []
            this.connection.shutdown()   
            this.player_shu = 0
            this.robot_shu = 0
            Table.default_table_id = -1
        }

        // isEmpty(){
        //     return this.status == mjconst.PS_EMPTY
        // }

        setZhuang(fang){
            this.zhuangjia = this.dialect.getZhuang(this.zhuangjia, fang)
        }

        isZhuang(player){
            return (player.fang == this.zhuangjia)
        }

        setCurrentDapai(player, pai){
            this.current_dapai_fang = player
            this.current_dapai = pai
        }
        getCurrentDapai(){
            return {pai: this.current_dapai, player: this.current_dapai_fang}
        }

        setCurrentMopai(fang, pai){
            this.current_mopai = pai  
            this.current_mopai_fang = fang
        }
        getCurrentMopai(){
            return {pai: this.current_mopai, fang: this.current_mopai_fang}
        }

        setDapaiQuan(player){
            return this.dapai_quan = player.fang
        }

        clearDapaiQuan(){
            return this.dapai_quan = -1
        }

        setYaopaiQuan(player){
            this.yaopai_quan = player.fang
        }

        clearYaopaiQuan(){
            return this.yaopai_quan = -1
        }

        isMyDapaiQuan(){
            return this.dapai_quan == this.wei_players[0].fang
        }

        isMyYaopaiQuan(){
            return this.yaopai_quan == this.wei_players[0].fang
        }
        
        updateDapaiStatistic(face){
            let result = this.getDapaiStatistic(face)  
            if( !!result ){
                this.dapai_statistics[face]++
            }else{
                this.dapai_statistics[face] = 1
            }
        }
        clearDapaiStatistic(){
            this.dapai_statistics = {}
        }
        
        getDapaiStatistic(face){
            let result = this.dapai_statistics[face]        
            if( !!result ){
                return result
            }else{
                return 0
            }
        }

        send(event_source,event_sink, event_type, event_body){
            // if(this.auto_mode == mjconst.UI_HUMAN_TEST ){
            //     return true
            // }
            return this.connection.send({
                client_id: this.client_id,
                table_id: this.table_id,
                source: event_source,
                sink: event_sink,
                type: event_type,
                body: event_body
            })
        }
    }

    function refreshContext(context){
        let table = context.table
        let I = context.I
        if(!table){
            context.table = Table.getDefault()
        }
        if(!I && context.table){
            context.I = context.table.getDefaultPlayer()
        }
        return !!context.table && !!context.I
    }

    return  {Pot,Face, Table, getDebug, setDebug, refreshContext}
    
})