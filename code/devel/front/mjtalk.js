define(['../common/mjconst.js', '../common/mjtable.js', '../common/mjutils.js'], 
function (mjconst, mjtable, mjutils) { 
    var stream; 
    var configuration = { 
    iceServers: [{ urls: "stun:www.lefan.fun:3478"},
                    //urls: "stun:stun.voipbuster.com:3478" },
                    //{urls: "stun:stun.internetcalls.com:3478"},
                    {urls: "turn:www.lefan.fun:3478",
                    username:"lefan",
                    credential: "Majiang12#$"}
                ]
    };
    
    const offerOptions = {
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 0
    }

    let rtcp_connections = {}
    let initial_called_peers = []
    const RTC_IDLE = 0
    const RTC_BUSY = 1
    let rtc_status = RTC_IDLE
    const context = {}

    function closeRtcpConnection(peer_id){
        let rtcp_connn = rtcp_connections[peer_id].rtcp_conn
        if(rtcp_connn){
            let local_id = context.I.fangToWei(peer_id)
            console.log("closeRtcpConnection", peer_id)
            document.querySelector('#audio_' + local_id).srcObject = null
            rtcp_connections[peer_id].tracks.forEach( track_id =>{
                rtcp_connn.removeTrack(track_id);
            })
            rtcp_connn.close()
            rtcp_connn.onicecandidate = null
            rtcp_connn.onaddstream = null
            delete(rtcp_connections[peer_id])
            if(Object.keys(rtcp_connections).length == 0){
                console.log("connection are released, release stream")
                stream.getTracks().forEach( track => {
                    track.stop();
                  });
                rtc_status = RTC_IDLE
                stream = null
                initial_called_peers = []
                wo = null
                table = null
                $('#button_talk').text('对讲')
            }
        }
    }

    function openRtcpConnection(peer_id, calling){
        let rtcp_conn = new RTCPeerConnection(configuration); 
        rtcp_connections[peer_id] = {rtcp_conn, calling, tracks:[]}
        rtcp_conn.ontrack = onRemoteStream.bind(null, peer_id)
        rtcp_conn.onicecandidate = onCandidate.bind(null, peer_id)
        return rtcp_conn
    }

    function saveRtcpTrack(peer_id, stream){
        let rtcp_conn = rtcp_connections[peer_id].rtcp_conn        
        stream.getTracks().forEach(track => {
            let track_id = rtcp_conn.addTrack(track, stream)
            rtcp_connections[peer_id].tracks.push(track_id)
        })

    }

    //initiating a call 
    function doTalk() {
        if(! mjtable.refreshContext(context)){
            mjutils.Tips.show('不在牌桌上不能对讲')
        }

        if(context.table.robot_shu > 2){
            mjutils.Tips.show('1人不能对讲')
            return
        } 

        if(rtc_status == RTC_IDLE){
            //处于空闲状态, 作为主教呼叫其它方
            initLocalStream(onLocalStreamOfCaller)
        }else{
            //通知所有人挂断
            context.I.send(mjconst.EA_OTHER, mjconst.ET_RTC_HANGUP)
            //处于主叫方, 挂断所所有通话
            initial_called_peers.forEach( peer_id => {
                let rtcp_conn_tuple = rtcp_connections[peer_id]
                if(rtcp_conn_tuple && rtcp_conn_tuple.calling){
                    console.log("hang up:", peer_id)
                    context.I.send(peer_id, mjconst.ET_RTC_LEAVE)
                    closeRtcpConnection(peer_id)    
                }
            })
        }
    }

    function handleHangup(msg){
        if(! mjtable.refreshContext(context)){
            return
        }

        //主叫方挂断所所有通话
        console.log("hangup request from", msg.source)
        initial_called_peers.forEach( peer_id => {
            let rtcp_conn_tuple = rtcp_connections[peer_id]
            if(rtcp_conn_tuple && rtcp_conn_tuple.calling){
                console.log("hang up:", peer_id)
                context.I.send(peer_id, mjconst.ET_RTC_LEAVE)
                closeRtcpConnection(peer_id)    
            }
        })
    }

    function handleSetup(msg){
        if(!mjtable.refreshContext(context)){
            return
        }
        //被北叫方, 建立二次通话
        console.log("setup request from", msg.source)
        initial_called_peers = msg.body.initial_called_peers

        initLocalStream(onLocalStreamOfSetup)
    }


    function initLocalStream(onlocalstream){
        if(!stream){
            navigator.mediaDevices.getUserMedia({video: false, audio: true})
            .then(local_stream => {
                onlocalstream(local_stream)
                rtc_status = RTC_BUSY
                $('#button_talk').text('挂断')            
            })
            .catch(error => {
                console.log(error)
                alert(`getUserMedia() error: ${error.name}`)})
                //$('#button_talk').text('对讲')
        }else{
            onlocalstream(stream)
        }
    }
    
    //when we got an answer from a remote user 
    function handleAnswer(msg) {
    console.log("handleAnswer:", msg.source)
    let rtcp_conn = rtcp_connections[msg.source].rtcp_conn
    rtcp_conn.setRemoteDescription(new RTCSessionDescription(msg.body)); 
    };
    
    //when we got an ice candidate from a remote user 
    function handleCandidate(msg) {
        console.log("handleCandidate:", msg.source)
        let rtcp_conn = rtcp_connections[msg.source].rtcp_conn
        rtcp_conn.addIceCandidate(new RTCIceCandidate(msg.body))
    };

    //when somebody sends us an offer 
    function handleOffer(msg) {
        let peer_id = msg.source
        console.log("handleOffer:", peer_id)
        //保存会话, 对方是主叫, 我是被叫(false)
        let rtcp_conn = openRtcpConnection(peer_id, false)
        rtcp_conn.setRemoteDescription(new RTCSessionDescription(msg.body.offer))
        initLocalStream(onLocalStreamOfCallee.bind(null, peer_id))
    }; 
    
    function handleLeave(msg) {
        let peer_id = msg.source
        console.log("handleLeave from:", peer_id)

        closeRtcpConnection(peer_id)
    }

    function onLocalStreamOfCaller(local_stream){
        stream = local_stream;
        initial_called_peers = []
        context.table.forEachPlayer( peer => {
            if(context.I.fang == peer.fang || peer.player_type == mjconst.ROBOT_PLAYER){
                return false   
            }
            initial_called_peers.push(peer.fang)
        })
        context.I.send(mjconst.EA_OTHER, mjconst.ET_RTC_SETUP, {initial_called_peers})
        initial_called_peers.forEach( peer_id => {
            //保存会话, 我是主叫, 对方是被叫
            let rtcp_conn = openRtcpConnection(peer_id, true)
            saveRtcpTrack(peer_id, stream)
            console.log('Adding local stream to rtcp_conn', peer_id) 
            rtcp_conn.createOffer(offerOptions)
                .then(onOffer.bind(null, peer_id))
                .catch(error => {console.log(error)})
        })
    }

    function onLocalStreamOfSetup(local_stream){
        stream = local_stream;
        //人数超过2人, 需要建立全链接. 由于最多至3人, 每个人只要再找一个下家就可以了 
        let called_shu = initial_called_peers.length
        let next_peer_id
        if(called_shu > 1){
            next_peer_id = (context.I.fang+1)%4
            if(initial_called_peers.indexOf(next_peer_id) < 0){
                next_peer_id = (context.I.fang+2)%4
            }
        }

        if(called_shu == 3 || (called_shu == 2 && next_peer_id > context.I.fang)){
            let rtcp_conn = openRtcpConnection(next_peer_id, true)
            saveRtcpTrack(next_peer_id, stream)
            console.log('Adding local stream to rtcp_conn to', next_peer_id) 

            rtcp_conn.createOffer(offerOptions)
                .then(onOffer.bind(null, next_peer_id))
                .catch(error => {console.log(error)})
        }
    }


    function onLocalStreamOfCallee(peer_id, local_stream){
        stream = local_stream;
        let rtcp_conn = rtcp_connections[peer_id].rtcp_conn
        saveRtcpTrack(peer_id, stream)
        console.log('Adding local stream to rtcp_conn', peer_id) 

        //create an answer to an offer
        rtcp_conn.createAnswer()
        .then(onAnswer.bind(null, peer_id))
        .catch(error => {alert("Err,or when creating an answer")})

        rtc_status = RTC_BUSY
    }

    function onAnswer(peer_id, answer){
        let rtcp_conn = rtcp_connections[peer_id].rtcp_conn
        rtcp_conn.setLocalDescription(answer)
        context.I.send(peer_id, mjconst.ET_RTC_ANSWER, answer)
    }

    function onCandidate(peer_id, event){
        if(event.candidate) {                 
            context.I.send(peer_id, mjconst.ET_RTC_CANDIDATE, event.candidate); 
        }
    }

    function onOffer(peer_id, offer){
        context.I.send(peer_id, mjconst.ET_RTC_OFFER, {offer})
        let rtcp_conn = rtcp_connections[peer_id].rtcp_conn
        rtcp_conn.setLocalDescription(offer)
    }

    function onRemoteStream(peer_id, event) {
        console.log('received remote stream');
        let local_id = context.I.fangToWei(peer_id)
        document.querySelector('#audio_' + local_id).srcObject = event.streams[0];
    }

    handlers = {}
    handlers[mjconst.ET_RTC_OFFER] = handleOffer
    handlers[mjconst.ET_RTC_ANSWER] = handleAnswer
    handlers[mjconst.ET_RTC_CANDIDATE] = handleCandidate
    handlers[mjconst.ET_RTC_LEAVE] = handleLeave
    handlers[mjconst.ET_RTC_HANGUP] = handleHangup
    handlers[mjconst.ET_RTC_SETUP] = handleSetup
    window.doTalk = doTalk

    return {handlers}
})
