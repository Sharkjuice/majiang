const mjconst = require("../common/mjconst.js")
const mjtable = require('../common/mjtable.js')
const mjutils = require('../common/mjutils.js')
const mjplayer = require('../common/mjplayer.js')
const conn = require('../common/connection_local.js')

function init(){
    //connecting to our signaling server     
    conn.ConnLocal.setDefaultHandler(defaultHandler)
    conn.ConnLocal.setEventHandler(mjconst.ET_JOIN, joinHandler)
    conn.ConnLocal.setEventHandler(mjconst.ET_LOGIN, loginHandler)
    conn.ConnLocal.setEventHandler(mjconst.ET_NIOJ, niojHandler)
    let local_server_conn = conn.ConnLocal.newConnection(conn.CONN_SERVER_END, 0)
    conn.ConnLocal.newConnection(conn.CONN_CLIENT_PEER, 1, local_server_conn.connector)
    return local_server_conn
}

//别人加入, 通知我的虚拟桌面
function joinHandler(msg){
    let v_table = mjtable.Table.get(msg.table_id)
    v_table.join(msg)
    v_table.forEachPlayer( player => {
        if(player.fang != msg.source && player.onseat){ 
            player.send(mjconst.EA_SYSTEM, mjconst.ET_NIOJ, msg.source)
        }                 
    })
}

function loginHandler(msg){
    let v_table = mjtable.Table.get(msg.table_id)
    if(!v_table){
        v_table = mjtable.Table.create(msg.table_id, msg.client_id,msg.body[1])
        v_table.status = mjconst.PS_WAITING
        v_table.setPlayers(mjplayer.createPlayers(v_table))
        v_table.connection = conn.getConnection(1)    
    }
    v_table.join(msg)
}

function niojHandler(msg){
    let v_table = mjtable.Table.get(msg.table_id)
    v_table.join(msg)
    return v_table
}

function defaultHandler(msg){    
    let source = msg.source
    let data = msg.body
    let v_table = mjtable.Table.get(msg.table_id)
    let src_player = v_table.getPlayerByFang(source)
    let pai_index
    let result
    switch (msg.type){
        case mjconst.ET_LAIZI:
            if(v_table.dialect.hasLaizi()){
                v_table.setDiceAndLaizi(data[0],data[1])
            }
            src_player.send(mjconst.EA_SYSTEM, mjconst.ET_LAIZI_END)
            break
        case mjconst.ET_FAPAI:
            data.forEach((pai_list,index) => {
                let player = v_table.getPlayerByFang(index)
                player.reset()
                player.fapai(pai_list)
            })
            src_player.send(mjconst.EA_SYSTEM, mjconst.ET_FAPAI_END)
            break
        case mjconst.ET_FAPAI_END:
            v_table.forEachPlayer( player => {
                if(player.onseat){
                //检查有没有特殊处理, 比如豹子,倒中发白
                if(v_table.dialect.allowInitAction()){ 
                    player.dialect.checkInitAction()
                    player.beginInitAction(true)
                }else
                if( v_table.isZhuang(player)){
                        player.selectForAutoDa(true)
                        //等色子转完再打牌
                        if(v_table.dialect.hasLaizi()){
                            setTimeout(() => player.beginDapai(), 3000)
                        }else{
                            player.beginDapai()
                        }
                    }
                }
            })
            break       
        //case mjconst.ET_INIT_ACTION:
        //    src_player.initAction(data)
        //    break
        case mjconst.ET_INIT_ACTION_END:
            v_table.forEachPlayer( player => {
                if(player.onseat && v_table.isZhuang(player)){
                    player.selectForAutoDa(true)
                    //等色子转完再打牌
                    if(v_table.dialect.hasLaizi()){
                        setTimeout(() => player.beginDapai(), 3000)
                    }else{
                        player.beginDapai()
                    }
                }
            })
            break
        case mjconst.ET_MOPAI:
            pai_index = data[0]
            if(pai_index >= 0){
                src_player.mopai(pai_index)
                src_player.endMopai()
            }else{
                console.log("没有牌了")
                v_table.clearYaopaiQuan()
                v_table.clearDapaiQuan()
                v_table.setZhuang(source)
                v_table.clearDapaiStatistic()

                v_table.forEachPlayer( player => {           
                    if(player.onseat && v_table.isZhuang(player)){
                        setTimeout(() => {
                            src_player.send(mjconst.EA_SYSTEM, mjconst.ET_LAIZI)
                            },
                            10000
                        )
                    }
                })
            }
            break
        case mjconst.ET_MOPAI_END:
            v_table.setDapaiQuan(source)
       
            result = src_player.calcMopai()  
            //console.log("摸牌分析,杠/胡:", can_gang, can_hu)

            if(result.can_hu){
                src_player.beginHupai() 
            }else
            if(result.can_gang){
                if(src_player.gang_type ==  mjconst.GT_ANGANG){
                    console.log("我摸牌暗杠, 发送杠牌通知")
                    src_player.beginInstantAngang()
                 }else
                if(src_player.gang_type == mjconst.GT_MOPAI_MINGGANG){        
                    console.log("我摸牌明杠, 发送杠牌通知")
                    src_player.beginMopaiMinggang()
                }else{
                    console.log("自摸杠牌Error:", src_player.gang_type)
                }            
            }else{
                src_player.selectForAutoDa(true)                
                src_player.beginDapai()
           }        
            break
        case mjconst.ET_DAPAI:
            if(!src_player.onseat){
                src_player.dapai(data)
            }
            let dapai_tuple = v_table.getCurrentDapai()
             
            v_table.forEachPlayer( player => {                
                if(player != src_player && player.onseat){
                    result = player.calcDapai(dapai_tuple)

                    //console.log(player.fang,": 打牌分析: 吃/碰/胡/杠:", result.can_chi,
                    //    result.can_peng, result.can_hu,result.can_gang)                
                    let request_type = mjutils.getReqestType(result.can_hu, result.can_gang,
                        result.can_peng,result.can_chi)
                    player.send(mjconst.EA_SYSTEM, request_type)
                }
            })
            break
        case mjconst.ET_CHIPAI:
        case mjconst.ET_PENGPAI:
            src_player.send(mjconst.EA_SYSTEM, mjconst.ET_CHIPENG_END)
            break
        case mjconst.ET_CHIPENG_END:
            src_player.endChiPeng()          
            break
        case mjconst.ET_DAPAI_MINGGANG:
        case mjconst.ET_MOPAI_MINGGANG:
        case mjconst.ET_INSTANT_ANGANG:
        case mjconst.ET_DEFERED_ANGANG:
             src_player.send(mjconst.EA_SYSTEM, mjconst.ET_GANGPAI_END)
            break
        case mjconst.ET_GANGPAI_END:
            src_player.endGangpai()   
            break    
        case mjconst.ET_MESSAGE:
            //console.log(mjutils.getFangName(source) + "说:" + data)
            break
        case mjconst.ET_PAI_QUAN:
            //console.log(src_player.fang_name + "边获得牌权:", data)
            let panquan_for = data
            v_table.setYaopaiQuan(source)
            switch (panquan_for){
                case mjconst.ET_MO_REQUEST:
                    src_player.beginMopai()
                    break;
                case mjconst.ET_CHI_REQUEST:
                    src_player.beginChipai()
                    break;
                case mjconst.ET_PENG_REQUEST:  
                    src_player.beginPengpai()
                    break
                case mjconst.ET_DAPAI_MINGGANG_REQUEST:
                    src_player.beginDapaiMinggang()
                    break
                case mjconst.ET_HU_REQUEST:
                    src_player.beginHupai()
                    break
            }
            break            
        case mjconst.ET_HUPAI:
            let hupai_info = data.hupai_info
            v_table.forEachPlayer( player => {                
                if(player != src_player && player.onseat){
                    hupai_info.scores[player.fang] = player.dialect.loseScore(
                        hupai_info.base_score, hupai_info.dianpao_fang)
                    hupai_info.reasons[player.fang] = player.dialect.getReasons()
                }
            })
            v_table.clearYaopaiQuan()
            v_table.clearDapaiQuan()
            v_table.setZhuang(source)
            v_table.clearDapaiStatistic()
            //delete(data.sentence_list)
            src_player.send(mjconst.EA_SYSTEM, mjconst.ET_HUPAI_END, data)
            break
        case mjconst.ET_CLOSE:
            //console.log("ET_CLOSE robot")
            v_table.close()
            break
    }
}
module.exports = {init}

