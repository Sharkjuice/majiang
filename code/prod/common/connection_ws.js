define(["./connection.js"], function (connection) {
const CONN_CLIENT_ID = 10000
const CONN_CLIENT_ID_END = 10001

//client端, 发送
function openHandler(){
    console.log("openHandler, pending events:", this.client_id,this.unsent_events)
    this.status = connection.CONN_CONNECTED
    this.send({type:CONN_CLIENT_ID, client_id: this.client_id, body: this.unsent_events})
    this.unsent_events  = []
}

function closeHandler(){
    //console.log("Connection broken")
    this.status = connection.CONN_BROKEN
}
    
class ConnRemote  extends connection.ConnBase{
    static newConnection(client_or_server, client_id, remote_addr_or_connector){
        let conn = new ConnRemote(client_or_server,client_id,remote_addr_or_connector)
        connection.setConnection(client_id, conn)
        return conn
    }

    static setDefaultHandler(onMessage){
        connection.ConnBase.default_handler = onMessage
    }
    static setEventHandler(event_type, handler){
        connection.ConnBase.handlers[event_type] = handler
    }
    
    static clientLoopHandler(msg){
        let real_msg
        //console.log("clientLoopHandler",msg.data)
        real_msg = JSON.parse(msg.data)
        //console.log("handle msg:", real_msg)
        let handler = connection.ConnBase.handlers[real_msg.type]
        if(handler){
            handler(real_msg)
        }else(
            connection.ConnBase.default_handler(real_msg)
        )
    }
    
    static serverLoopHandler(msg){
        let real_msg
        //console.log("sererLoopHandler",msg)
        real_msg =  JSON.parse(msg)
        //console.log("serverLoopHandler:", real_msg)
        let handler = connection.ConnBase.handlers[real_msg.type]
        if(handler){
            handler(real_msg)
        }else(
            connection.ConnBase.default_handler(real_msg)
        )
    }
    
    static clientSyncHandler(handler){
        if(handler){
            console.log("clientSyncHandler", CONN_CLIENT_ID_END)
            this.setEventHandler(CONN_CLIENT_ID_END, handler)
        }else{
            this.setEventHandler(CONN_CLIENT_ID_END, (msg) =>{
                msg.body.forEach( pending_msg => {
                    let handler = ConnBase.handlers[pending_msg.type]
                    if(handler){
                        handler(pending_msg)
                    }else(
                        ConnBase.default_handler(pending_msg)
                    )
                })            
            })
        }
    }

    static syncClient(ws){
        this.setEventHandler(CONN_CLIENT_ID, msg =>{
            let conn_remote = connection.getConnection(msg.client_id)
            //console.log("syncClient", msg)
            if(conn_remote && conn_remote.status != connection.CONN_SHUTDOWN){
                conn_remote.reconnect(ws)
                msg.body.forEach( pending_msg => {
                    let handler = connection.ConnBase.handlers[pending_msg.type]
                    if(handler){
                        handler(pending_msg)
                    }else(
                        connection.ConnBase.default_handler(pending_msg)
                    )
                })
            }else{
                conn_remote = ConnRemote.newConnection(connection.CONN_SERVER_PEER, msg.client_id, ws)
            }
            console.log("open handler server side, pending events:",conn_remote.unsent_events)
            conn_remote.status = connection.CONN_CONNECTED
            conn_remote.send({type: CONN_CLIENT_ID_END, client_id: msg.client_id,body: conn_remote.unsent_events})
            conn_remote.unsent_events = []    
        //server端发送
        })
    }
    
    constructor(client_or_server, client_id, remote_addr_or_connector){
        super(client_or_server, client_id, remote_addr_or_connector)
        if(!remote_addr_or_connector){
            console.log("error, remote connection must have addr or socket parameter")
            return
        }
        this.is_local = false           
        if(client_or_server == connection.CONN_CLIENT_PEER){
            this.connector = new WebSocket(remote_addr_or_connector)
            this.is_secure = remote_addr_or_connector[2] == 's'
            this.connector.onclose = closeHandler.bind(this)
            this.connector.onopen = openHandler.bind(this)
            this.connector.onmessage = ConnRemote.clientLoopHandler
            this.connector.onerror = err => {console.log("Got error", err)}
        }else{
            this.connector = remote_addr_or_connector
            this.connector.on("close", closeHandler.bind(this))
            this.connector.on("error", err => {console.log("Got error", err)})
        }
    }

    reconnect(connector){
        if(this.is_client){
            console.log("reconnect...")
            this.connector = new WebSocket(this.remote_addr_or_connector)
            this.connector.onclose = closeHandler.bind(this)
            this.connector.onmessage = ConnRemote.clientLoopHandler
            this.connector.onerror = err => {console.log("Got error", err)}
            this.connector.onopen = openHandler.bind(this)
        }else{
            this.connector = connector
            this.connector.on("close", closeHandler.bind(this))
            this.connector.on("error", err => {console.log("Got error", err)})
        }        
    }

    shutdown(){
        super.shutdown()
        this.connector.close()
        connection.delConnection(this.client_id)
    }
    
    send(args){
        let result = true
        if(this.status == connection.CONN_SHUTDOWN){
            console.log("Error: connection is shutdown!")
            result = false
        }
        if(this.connector.readyState === this.connector.OPEN){
            //connection.js:249 WebSocket is already in CLOSING or CLOSED state
            this.connector.send(JSON.stringify(args))
        }else{
            console.log("connector.send, broken")
            this.unsent_events.push(args)
            result = false
        }
        return result
    }
}

return {
    ConnRemote,
    getConnection: connection.getConnection,
    CONN_CLIENT_PEER: connection.CONN_CLIENT_PEER,
    CONN_SERVER_PEER: connection.CONN_SERVER_PEER,
    CONN_SHUTDOWN: connection.CONN_SHUTDOWN
}
})