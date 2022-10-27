define(["events", "./connection.js"], function (events,connection) {
const TOPIC_FROM_SERVER = "TOPIC_0"
const TOPIC_FROM_CLIENT = "TOPIC_1"

class ConnLocal extends connection.ConnBase{
    static local_handlers = {}
    static local_default_handler = null

    static newConnection(client_or_server, client_id, remote_addr_or_connector){
        let conn = new ConnLocal(client_or_server,client_id,remote_addr_or_connector)
        connection.setConnection(client_id, conn)
        return conn
    }

    static setDefaultHandler(onMessage){
        ConnLocal.local_default_handler = onMessage
    }
    
    static setEventHandler(event_type, handler){
        ConnLocal.local_handlers[event_type] = handler
    }

    static clientLoopHandler(msg){
        //console.log("clientLoopHandler msg:", msg)
        let handler = ConnLocal.local_handlers[msg.type]
        if(handler){
            handler(msg)
        }else(
            ConnLocal.local_default_handler(msg)
        )
    }
    
    static serverLoopHandler(msg){
        //console.log("serverLoopHandler msg:", msg)
        let handler = connection.ConnBase.handlers[msg.type]
        if(handler){
            handler(msg)
        }else(
            connection.ConnBase.default_handler(msg)
        )
    }    
    
    constructor(client_or_server, client_id, connector){
        super(client_or_server, client_id, connector)
        if(connector){
            this.connector = connector
        }else{
            this.connector = new events.EventEmitter()
        }
        this.is_local = true
        if(this.is_client){
            this.connector.addListener(TOPIC_FROM_SERVER, ConnLocal.clientLoopHandler)
        }else{
            this.connector.addListener(TOPIC_FROM_CLIENT, ConnLocal.serverLoopHandler)
        }
    }

    send(args){
        if(this.is_client){
            //console.log("send to server locally:", args)
            this.connector.emit(TOPIC_FROM_CLIENT,args)
        }else{
            //console.log("send to client locally:", args)
            this.connector.emit(TOPIC_FROM_SERVER,args)
        }
        return true
    }
}
    
return {ConnLocal,
    getConnection:connection.getConnection,
    CONN_CLIENT_PEER: connection.CONN_CLIENT_PEER,
    CONN_SERVER_PEER: connection.CONN_SERVER_PEER,
    }
})