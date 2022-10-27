define([], function () {
const CONN_CLIENT_PEER = 0
const CONN_SERVER_PEER = 1
const CONN_INIT = 0
const CONN_CONNECTED = 1
const CONN_BROKEN = 2
const CONN_SHUTDOWN = 3


const pool = {}

function getConnection(client_id){
    conn = pool[client_id]
    if(conn && conn.status != CONN_SHUTDOWN){
        return conn
    }
    return null
}

function setConnection(client_id, connection){
    pool[client_id] = connection
}

function delConnection(client_id){
    delete(pool[client_id])
}

class ConnBase{
    static handlers = {}
    static default_handler = null

    constructor(client_or_server, client_id, remote_addr_or_connector=null){
        this.status = CONN_INIT
        this.unsent_events = []
        this.remote_addr_or_connector = remote_addr_or_connector
        this.client_id = client_id
        this.is_client = client_or_server == CONN_CLIENT_PEER
    }

    shutdown(){
        this.status = CONN_SHUTDOWN
        this.unsent_events = []
    }

}


return {//函数
    getConnection,  setConnection, delConnection, ConnBase,
    //常数
    CONN_CLIENT_PEER, CONN_SERVER_PEER, CONN_BROKEN, CONN_SHUTDOWN, CONN_CONNECTED,    
    }
})