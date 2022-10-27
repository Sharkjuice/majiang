const Koa = require("koa");
const koa_bodyparser = require("koa-bodyparser");
const WebSocket  = require('ws')
require("amd-loader")
const router = require("koa-router")();
const mjconst = require("../common/mjconst.js")
const conn = require('../common/connection_ws.js')
const mjutils = require('../common/mjutils.js')
const _ = require('../dialects/list')
const mjautocontrol = require('./mjautocontrol.js')
const majiang = require('./majiang.js')

const http = require('http')

var args = process.argv.splice(2)
const SVR_PORT = parseInt(args[0])
const FANGJIAN_ID = parseInt(args[1])
const ADM_PORT = parseInt(args[2])

function main()
{
    const app = new Koa();
    let server = app.listen(SVR_PORT,"0.0.0.0");
    // 同一个端口监听不同的服务
    const ws = new WebSocket.Server({server});

    app.use(koa_bodyparser({
        enableTypes:["json","test","form"],
        onerror:function (err,ctx){
            console.log("webserver body parse error",err);
            ctx.throw(400,"body parse error");
        },
    }));

    router.get('/status', getTableStatus);
    app.use(router.routes());
    app.on('error', err => {
        console.log('webserver error', err);
    });

    ws.on('connection', ws => {
        // 绑定websocket对象
        //console.log("User connected")
        conn.ConnRemote.setDefaultHandler(onDefault)
        conn.ConnRemote.setEventHandler(mjconst.ET_LOGIN, onLogin)
        conn.ConnRemote.syncClient(ws)
        ws.on("message", conn.ConnRemote.serverLoopHandler)
    });

    setInterval(watching, 900000)
    console.log('webserver start listen on: ', SVR_PORT);
    notifyStartRoom(FANGJIAN_ID)
}

function getTableStatus(ctx){
    let status = {1:0,2:0,3:0,4:0,5:0}
    Object.keys(majiang.room).forEach( table_id => {
        let table = majiang.room[table_id]        
        status[table_id] = table.status
    })
    ctx.body = status
}

function addRobot(table, robot_shu){
    if(robot_shu == 0){
        return
    }
    //console.log("add robot...")
    let conn_server_local = conn.getConnection(0)
    if(!conn_server_local){
        conn_server_local = mjautocontrol.init()
    }
    client_id = mjutils.getUniqueId()
    table.client_connections[client_id] = conn_server_local

    for(let i = 0; i< robot_shu; i++){
        let res_data = table.join("机器人", mjconst.ROBOT_PLAYER)
        let fang = res_data.fang
        if(fang >= 0){
            table.player_connections[fang] = conn_server_local
            table.players[fang].client_id = client_id
            res_data.auto_dapai = true
            table.send(fang, fang, mjconst.ET_LOGIN, [res_data, table.info()])
            table.send(fang, mjconst.EA_OTHER, mjconst.ET_JOIN, [res_data])
        }
    }
}

function onLogin(msg){
    let data = msg.body
    let table_id = msg.table_id
    let table = majiang.Table.get(table_id)

    if(data.robot_only){
        if(table){
            addRobot(table,data.robot_shu)
        }else{
            console.log("error: add robot, but the table is not exist")
        }
        return
    }
    let conn_server = conn.getConnection(msg.client_id)
    let res_data
    if(!table){
        table = majiang.Table.create(table_id)
        res_data = table.start(data)
    }else
    if(table.status == mjconst.PS_EMPTY){
        res_data = table.start(data)
    }else{
        res_data = table.join(data.name, mjconst.HUMAN_PLAYER)
    }
    let fang = res_data.fang
    if(fang < 0){
        conn_server.send({type: mjconst.ET_LOGIN, body:[res_data,{msg:majiang.err_msg_map[fang]}]})
        return 
    }
    table.client_connections[msg.client_id] = conn_server
    table.player_connections[fang] = conn_server
    table.players[fang].client_id = msg.client_id

    res_data.auto_dapai = false
    table_info = table.info()
    if(fang == 0){
        let sync = table.getSync(mjconst.ET_JOIN_END)
        sync.reset(0, 6)
        table.send(0, 0, mjconst.ET_LOGIN, [res_data, table.info()])
        table.send(0, mjconst.EA_OTHER, mjconst.ET_JOIN, [res_data])
    }else{
        table.send(fang, fang, mjconst.ET_LOGIN, [res_data, table.info()])
        table.send(fang, mjconst.EA_OTHER, mjconst.ET_JOIN, [res_data])
    }
    if(data.robot_shu > 0){
        if(table){
            addRobot(table,data.robot_shu)
        }else{
            console.log("error: add robot, but the table is not exist")
        }
    }
}

function onDefault(msg){
    let table = majiang.Table.get(msg.table_id)
    if( (! table) || table.status == mjconst.PS_EMPTY){
        console.log("Error table!", msg)
        return
    }
    let source = msg.source
    let data = msg.body
    let sync

    switch(msg.type) {
    case mjconst.ET_NIOJ:
        table.send(source, data, mjconst.ET_NIOJ, [table.players[source]])
        sync = table.getSync(mjconst.ET_JOIN_END)
        sync.countup()
        if(sync.complete()){
            origin = sync.getOwner()
            table.send(origin, mjconst.EA_ALL, mjconst.ET_JOIN_END)
        }
        break
    case mjconst.ET_LAIZI:
        table.reset(source)
        table.getSync(mjconst.ET_LAIZI_END).reset(source, table.sync_count[4])
        let dice_laizi = table.molaizi()
        table.send(source, mjconst.EA_ALL, mjconst.ET_LAIZI, dice_laizi)
        table.startRecord()
        table.record(source, mjconst.ET_LAIZI, dice_laizi)
        break
    case mjconst.ET_LAIZI_END:
        sync = table.getSync(mjconst.ET_LAIZI_END)
        sync.countup()
        if(sync.complete()){
            origin = sync.getOwner()
            table.getSync(mjconst.ET_FAPAI_END).reset(origin, table.sync_count[4])
            
            if(table.dialect.allowInitAction()){
                sync = table.getSync(mjconst.ET_INIT_ACTION).reset(source, 4)
            }

            let pai_lists = []
            table.players.forEach((_, index) => {
                let index_list = table.fapai(index == table.zhuangjia)
                pai_lists.push(index_list)
                table.record(index, mjconst.ET_FAPAI, index_list)
            })
            table.send(origin, mjconst.EA_ALL, mjconst.ET_FAPAI, pai_lists)
        }
        break
    case mjconst.ET_FAPAI_END:
        sync = table.getSync(mjconst.ET_FAPAI_END)
        sync.countup()
        if(sync.complete()){
            origin = sync.getOwner()
            table.setPaiquan(origin)
            table.send(origin, mjconst.EA_ALL, mjconst.ET_FAPAI_END, table.pai_list.length)
        }
        break
    case mjconst.ET_INIT_ACTION:
        if(!!data){
            table.record(source, msg.type, data)
        }
        sync = table.getSync(mjconst.ET_INIT_ACTION)
        sync.countup()
        if(sync.complete()){
            origin = sync.getOwner()
            table.send(origin, mjconst.EA_ALL, mjconst.ET_INIT_ACTION_END)
        }
        break
    case mjconst.ET_MOPAI:  
        if(table.assertPaiquan(source)){
            table.getSync(mjconst.ET_MOPAI_END).reset(source,table.sync_count[4])
            pai = table.mopai()            
            if(pai >= 0){
                table.record(source, msg.type, pai)
                table.send(source, mjconst.EA_ALL, mjconst.ET_MOPAI, [pai, table.pai_list.length])
            }else{
				table.record(source, msg.type, -1)
                table.send(source, mjconst.EA_ALL, mjconst.ET_MOPAI, [-1, table.pai_list.length])
                //result = pai
                console.log("error: no pai", table.pai_list)
                table.clearPaiquan()
            }
        }else{
            result = -9
            console.log("Error -9", source, table.paiquan)
        }
        break
    case mjconst.ET_MOPAI_END:
        sync = table.getSync(mjconst.ET_MOPAI_END)
        sync.countup()
        if(sync.complete()){
            origin = sync.getOwner()
            table.send(origin, origin, mjconst.ET_MOPAI_END)
        }
        break
    case mjconst.ET_DAPAI:
        table.clearPaiquan()
        table.someoneDapai(source)
        table.record(source, msg.type, data)
        break
    case mjconst.ET_MO_REQUEST:
        table.someoneWant(source, mjconst.ET_MO_REQUEST)
        break
    case mjconst.ET_CHI_REQUEST:
        table.someoneWant(source, mjconst.ET_CHI_REQUEST)
        break
    case mjconst.ET_PENG_REQUEST:
        table.someoneWant(source, mjconst.ET_PENG_REQUEST)
        break
    case mjconst.ET_DAPAI_MINGGANG_REQUEST:
        table.someoneWant(source, mjconst.ET_DAPAI_MINGGANG_REQUEST)
        break
    case mjconst.ET_HU_REQUEST:
        table.someoneWant(source, mjconst.ET_HU_REQUEST)
        break
    case mjconst.ET_CHIPAI:
    case mjconst.ET_PENGPAI:
        table.record(source, msg.type, data)
        table.getSync(mjconst.ET_CHIPENG_END).reset(source, table.sync_count[source])
        break
    case mjconst.ET_CHIPENG_END:
        sync = table.getSync(mjconst.ET_CHIPENG_END)
        sync.countup()
        if(sync.complete()){
            origin = sync.getOwner()
            table.send(origin, origin, mjconst.ET_CHIPENG_END)
        }
        break
    case mjconst.ET_DAPAI_MINGGANG:
    case mjconst.ET_MOPAI_MINGGANG:
    case mjconst.ET_INSTANT_ANGANG:
    case mjconst.ET_DEFERED_ANGANG:
        table.record(source, msg.type, data)
        table.getSync(mjconst.ET_GANGPAI_END).reset(source ,table.sync_count[source])
        break
    case mjconst.ET_GANGPAI_END:
        sync = table.getSync(mjconst.ET_GANGPAI_END)
        sync.countup()
        if(sync.complete()){
            origin = sync.getOwner()
            table.send(origin, origin, mjconst.ET_GANGPAI_END)
        }
        break
    case mjconst.ET_HUPAI:
        table.getSync(mjconst.ET_HUPAI_END).reset(source, table.sync_count[source])
        table.record(source, msg.type, data)
        //table.saveRecord()
        break
    case mjconst.ET_HUPAI_END:
        sync = table.getSync(mjconst.ET_HUPAI_END)
        sync.countup()

        let scores = sync.getData('scores')
        if(!scores){
            sync.saveData('scores', data.hupai_info.scores)
        }else{
            Object.assign(scores, data.hupai_info.scores)
        }

        let reasons = sync.getData('reasons')
        if(!reasons){
            sync.saveData('reasons', data.hupai_info.reasons)
        }else{
            Object.assign(reasons, data.hupai_info.reasons)
        }
        table.record(source, msg.type, data)
        if(sync.complete()){
            origin = sync.getOwner()
            let total_score = 0
            let reasons = sync.getData('reasons')
            let scores = sync.getData('scores')
            Object.keys(scores).forEach( index => {
                total_score += scores[index]
                scores[index] *= -1
            })
    
            table.clearPaiquan()
            data.hupai_info.scores = scores
            data.hupai_info.reasons = reasons
            data.hupai_info.scores[origin] = total_score
            table.setZhuang(origin)
            table.send(origin, mjconst.EA_ALL, mjconst.ET_HUPAI_END, data)
            table.saveRecord()
            table.ju_shu++
        }
        break
    case mjconst.ET_CLOSE:
        //console.log("ET_CLOSE", msg)
        table.send(source, mjconst.EA_OTHER, mjconst.ET_CLOSE, data)
        notifyReleaseTable(table)
        table.saveRecord()
        table.close()
        break
    }
 
    if(msg.sink != mjconst.EA_SYSTEM){
        table.send(source, msg.sink, msg.type, data)
    }
}

function notifyReleaseTable(table){
    const options = {
        hostname: '127.0.0.1',
        port: ADM_PORT,
        path: '/majiang/admin/table/' + table.table_route + '/stop/notify',
        method: 'POST'
    }
  
    const req = http.request(options, res => {
        res.on('data', d => {
        //console.log("release table", table.table_id)
        })
    })
  
    req.on('error', error => {
        console.error(error)
    })
  
    req.end()
}

function notifyStartRoom(room_id){
    const options = {
        hostname: '127.0.0.1',
        port: ADM_PORT,
        path: '/majiang/admin/room/' + room_id + '/start/notify',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }
  
    let status = {1:0,2:0,3:0,4:0,5:0}
    Object.keys(majiang.room).forEach( table_id => {
        let table = majiang.room[table_id]        
        if(table.status = mjconst.PS_OFFLINE) {
            status[table_id] = 0
        }else{
            status[table_id] = 1
        }
    })

    const req = http.request(options, res => {
        res.on('data', d => {
        })
    })
  
    req.on('error', error => {
        console.error(error)
    })
    req.write(JSON.stringify(status))
    req.end()
}

  

let heartbeats_snapshot = {1: -100, 2: -100, 3: -100, 4: -100, 5: -100}
function watching(){    
    Object.keys(majiang.room).forEach( table_id => {
        let table = majiang.room[table_id]        
        if(table.status >  mjconst.PS_FOUR) {
            return false
        }
        let cur_heartbeats = table.getHeartbeats()
        if(cur_heartbeats == heartbeats_snapshot[table_id]){
            //console.log("自动关闭牌桌! 牌桌号:", table_id)
            notifyReleaseTable(table)
            table.send(0, mjconst.EA_ALL, mjconst.ET_CLOSE, "超时自动退出牌桌")
            table.close()
        }else{
            heartbeats_snapshot[table_id] = cur_heartbeats
        }
    })
}


main();