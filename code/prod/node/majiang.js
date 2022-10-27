const mjconst = require("../common/mjconst.js")
const mjtable = require("../common/mjtable.js")
const fs = require("fs")

const TOTAL_PAISHU = 136

const err_msg_map = {
     0: "成功",
     '-1': "牌桌已占用,请选择其他牌桌", 
     '-2': "当前牌桌未开", 
     '-3': "牌桌号无效", 
     '-4': "人数太多,超过4人",
     '-5': "牌桌人数不够",
     '-6': "庄家才能开局",
     '-7': "庄家才能摸赖子",
     '-8': "牌已经摸完了",
     '-9': "没有轮到你摸牌",
     '-10': "正在打牌,不能退出",
     '-11': "正在打牌,不能关闭",
     '-12': "桌主不能退出",
     '-13': "桌主才能退桌",
     '-14': "恢复不成功",
     '-100': "牌桌已经收回"
    }
const action_map = {}
action_map[mjconst.ET_LAIZI] = "dice_laizi"
action_map[mjconst.ET_FAPAI] = "fapa"
action_map[mjconst.ET_MOPAI] = "mopai"
action_map[mjconst.ET_DAPAI] = "dapai"
action_map[mjconst.ET_CHIPAI] = "chipai"
action_map[mjconst.ET_PENGPAI] = "pengpai"
action_map[mjconst.ET_DAPAI_MINGGANG] = "dapaiMinggang"
action_map[mjconst.ET_MOPAI_MINGGANG] = "dice_laizi"
action_map[mjconst.ET_INSTANT_ANGANG] = "dice_laizi"
action_map[mjconst.ET_DEFERED_ANGANG] = "dice_laizi"

const room = {}
class Table{
 
    static create(table_id){
        let new_table = new Table(table_id)
        room[table_id] = new_table
        return new_table
    }

    static get(table_id){
        return room[table_id]
    }

    static getRoomStatus(){
        let status = {
            1: mjconst.PS_EMPTY,2: mjconst.PS_EMPTY,3: mjconst.PS_EMPTY,
            4: mjconst.PS_EMPTY,5: mjconst.PS_EMPTY}
        Object.keys(room).forEach( key => {
            status[key] = room[key].status
        })
        return status
    }

    constructor(table_id){
        this.robot_shu = 0
        this.total_paishu = TOTAL_PAISHU
        this.table_id = table_id
        this.pai_list = []
        this.paiquan = 0
        this.zhuangjia = 0
        this.players = [
            {fang: 0, online: false},
            {fang: 1, online: false},
            {fang: 2, online: false},
            {fang: 3, online: false}]
        this.wants = {source:-1, want:-1}
        this.heartbeats = 0
        this.player_connections = {}
        this.client_connections = {}
        this.client = {}
        this.status = mjconst.PS_EMPTY
        this.start_time = ""
        this.dialect = ""
        this.ju_shu = 0
        this.table_route = ""
        this.table_name = ""
        this.dapai_history = []
        this.pending_events = []
        this.sync_count = []
        this.sync_pool = {}
    
    } 

    startRecord(){
        this.dapai_history = []
        this.dapai_history.push(this.info())
    }

    record(fang, action, param){
        //console.log(dapai_action)
        this.dapai_history.push({fang,action,param})
    }

    setZhuang(hu_fang){
        this.zhuangjia = this.dialect.getZhuang(this.zhuangjia, hu_fang)
    }
    saveRecord(){
        if(this.dapai_history.length == 0){
            console.log('saveRecord: 打牌记录为空!')
            return 
        }
        let text =  JSON.stringify(this.dapai_history)
        let time_part = this.start_time.replace(/(\/|:| )/g,"-")
        let filename = `/home/xby/majiang/data/${this.table_route}_${time_part}_${this.ju_shu}.json`
        fs.writeFile(filename, text, {flag:'a'}, err => {
                if (err) throw err
                console.log('保存牌局到文件:', filename)
            }
        )
        this.dapai_history = []
    }

    info(){
        return {
            start_time: this.start_time,
            dialect_name: this.dialect.name(),
            table_name: this.table_name,
            table_route: this.table_route,
            max_ju: this.max_ju
        }
    }

    getHeartbeats(){
        return this.heartbeats
    }    

    start(data){
        let available_seat
        this.status = mjconst.PS_ONE
        this.owner = 0
        this.table_route = data.table_route
        this.table_name = data.table_name
        this.max_ju = data.max_ju
        this.ju_shu = 0
        let time_now = new Date()
        this.start_time = time_now.toLocaleString("zh-CN",{dateStyle:"short", 
            timeStyle:"short", hourCycle:"h24"})
        available_seat = this.players[0]
        available_seat.online = true
        available_seat.name = data.name
        available_seat.player_type = mjconst.HUMAN_PLAYER
        this.dialect = mjtable.Table.getDialect(data.dialect)
        return available_seat
    }


    join(name, player_type){
        if(this.status >= mjconst.PS_FOUR){
            console.log("join error....")
            return {fang: -4}
        }
        let available_seat
        let name_duplicated = false
        this.players.forEach( py => {
            if(!py.online) {
                if(!available_seat){
                    available_seat = py
                }
            }else{
                if(name == py.name){
                    name_duplicated = true
                }
            }
        })

        if(!available_seat){
            return available_seat = {fang: -4}
        }

        //重复, 名字加后缀
        if(name_duplicated){ 
            available_seat.name = name + "-" + available_seat.fang
        }else{
            available_seat.name = name
        }
        available_seat.player_type = player_type
        available_seat.online = true
        this.status += 1
        if(player_type == mjconst.ROBOT_PLAYER){
            this.robot_shu++
        }

        if(this.status == mjconst.PS_FOUR){
            let share_paizhou_0 = (this.robot_shu > 0)?1:0
            let share_paizhou_1 = (this.robot_shu > 1)?1:0    

            this.players.forEach( (player, index) => {
                if(player.player_type == mjconst.ROBOT_PLAYER){
                    this.sync_count[index] =  4 - this.robot_shu + share_paizhou_1
                }else{
                    this.sync_count[index] =   3 - this.robot_shu + share_paizhou_0
                }
            })
            this.sync_count[4] =  4 - this.robot_shu + share_paizhou_0
        }
        return available_seat
    }
 
    close(){
        this.status = mjconst.PS_EMPTY
        this.pai_list = []
        this.zhuangjia = 0
        this.players.forEach( py =>{ py.online = false})
        this.heartbeats = 0
        Object.keys(this.client_connections).forEach( client_id => {
            this.client_connections[client_id].shutdown()
        })
        this.player_connections = {}
        this.client_connections = {}
        this.robot_shu = 0
        this.sync_pool = []
    }

    xipai(){
        this.pai_list = []//= [...Array(136).keys()]
        let count = 0
        while(true){    
            let pai_index = Math.floor(Math.random()*TOTAL_PAISHU)
            if(this.pai_list.indexOf(pai_index) < 0){
                if(this.dialect.hasNews()){
                    count++
                    this.pai_list.push(pai_index)
                    if(count == TOTAL_PAISHU){
                        break
                    }
                }else{
                    if(pai_index <= 115 || pai_index >= 132){
                        count++
                        this.pai_list.push(pai_index)
                    }
                    if(count == (TOTAL_PAISHU - 16)){
                        break
                    }        
                }
            }
        }
    }

    fapai(is_zhuang){
        //开始摸牌一次给13张或14张
        let pai_list = []
        if(is_zhuang){
            pai_list = this.pai_list.splice(-14)
        }else{
            pai_list = this.pai_list.splice(-13)
        }
        return pai_list
    }

    mopai(){
        let pai = this.pai_list.pop()
        return (pai==null)?-8:pai
    }

    reset(fang){
        this.xipai()
        this.paiquan = fang
    }

    molaizi(){
        let dice = Math.ceil(Math.random()*6)
        let pai = this.pai_list[6]
        return [dice,pai]
    }

    try_send(dest_conn,event_source,event_sink,event_type,event_body){
        if(!!dest_conn){
            return dest_conn.send({
                client_id: this.players[event_source].client_id,
                table_id: this.table_id,
                source: event_source,
                sink: event_sink,
                type: event_type,
                body: event_body
            })
        }else{
            return false
        }
    }

    send(event_source, event_sink, event_type, event_body=false){
        this.heartbeats++
        let src_conn, dest_conn, src_client_id
        if(event_sink == mjconst.EA_ALL) {
            Object.keys(this.client_connections).forEach( index => {
                dest_conn = this.client_connections[index]
                this.try_send(dest_conn,event_source,event_sink,event_type,event_body)
            }) 
        }else
        if(event_sink == mjconst.EA_OTHER) {
            src_conn = this.player_connections[event_source]
            if(src_conn.is_local && this.robot_shu > 1){
                Object.keys(this.client_connections).forEach( index => {
                    dest_conn = this.client_connections[index]
                    this.try_send(dest_conn,event_source,event_sink,event_type,event_body)                    
                })  
            }else{
                src_client_id = this.players[event_source].client_id
                Object.keys(this.client_connections).forEach( index => {
                    dest_conn = this.client_connections[index]
                    if(index != src_client_id){
                        this.try_send(dest_conn,event_source,event_sink,event_type,event_body)                    
                    }
                })
            }
        }else{
            dest_conn = this.player_connections[event_sink]
            this.try_send(dest_conn,event_source,event_sink,event_type,event_body)                    
        }
    }

     someoneDapai(source){
        //console.log("有人打牌: ",source)
        this.getSync(mjconst.ET_DAPAI_END).reset(source,3)
        this.wants = {}
     }

    someoneWant(source, want){
        //console.log("下家请求: ",source, want)
        this.wants[source] = [source, want]
        let sync = this.getSync(mjconst.ET_DAPAI_END)
        sync.countup()
        if(sync.complete()){
            this.decidePaiquan()
        }
    }
 
    decidePaiquan(){
        let fang,source,want
        let dapai_fang = this.getSync(mjconst.ET_DAPAI_END).getOwner()
        let next_fang = [(dapai_fang + 1) % 4, (dapai_fang + 2) % 4, (dapai_fang + 3) % 4]

        for(let i= 0; i < 3;i++){
            fang = next_fang[i]
            source  = this.wants[fang][0]
            want = this.wants[fang][1]
            if(want == mjconst.ET_HU_REQUEST){         
                this.setPaiquan(source)
                //console.log("授予牌权: ",source, want)
                this.send(source, source, mjconst.ET_PAI_QUAN, want)
                return
            }
        }
        for(let i= 0; i < 3;i++){
            fang = next_fang[i]
            source  = this.wants[fang][0]
            want = this.wants[fang][1]            
            if(want == mjconst.ET_PENG_REQUEST || want == mjconst.ET_DAPAI_MINGGANG_REQUEST){          
                this.setPaiquan(source)
                //console.log("授予牌权: ",source, want)
                this.send(source, source, mjconst.ET_PAI_QUAN, want)
                return
            }
        }
        source  = this.wants[next_fang[0]][0]
        want = this.wants[next_fang[0]][1]
        this.setPaiquan(source)
        //console.log("授予牌权: ",source, want)
        this.send(source, source, mjconst.ET_PAI_QUAN, want) 
    }

    clearPaiquan(){
        this.paiquan = -1
    }

    setPaiquan(source){
        this.paiquan = source   
    }

    assertPaiquan(source){
        return this.paiquan == source
    }

    getSync(id){
        let sync = this.sync_pool[id]
        if(!sync){
            sync = new ClientSync(id)   
            this.sync_pool[id] = sync
        }
        return sync
    }
}

class ClientSync{
    constructor(id){
        this.id = id
        this.owner = -1
        this._count = 0
        this.count_to = 0
        this.data = null
    }

    reset(owner, count_to){
        //console.log("sync reset:", this.id, count_to)
        this.owner = owner
        this._count = 0
        this.count_to = count_to
        this.data = {}
    }


    countup(){
        this._count ++
        //console.log("sync countup:", this.id, this._count)
    }

    saveData(key,value){
        this.data[key] = value
    }

    getData(key){
        return this.data[key]
    }

    complete(){
        return this._count == this.count_to
    }
    getOwner(){
        return this.owner
    }

    getCount(){
        return this._count
    }
}

module.exports = {Table, room, err_msg_map}
