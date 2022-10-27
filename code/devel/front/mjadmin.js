define(['../common/mjconst.js','../common/mjutils.js', '../common/mjtable.js','../dialects/list.js'], 
function (mjconst, mjutils, mjtable, _) {
    const ajax_prom = mjutils.promisify($.ajax)

    const VueLogin = {
        data(){
            let username = this.remember_me?"admin":""
            return {
                username: username,
                password: false,
                remember_me: false
            }
        },
        methods: {
            login(){
                ajax_prom({
                    url:'/majiang/admin/login', 
                    type: "POST",
                    contentType: "application/json",
                    dataType: "json",
                    data: JSON.stringify({
                        username: this.username,
                        password: this.password,
                        remember_me: this.remember_me})
                })
                .then( data => {
                        if(data.result == 0){
                            $("#modal_login").modal("hide")
                            window.location.href = '/majiang/admin'
                        }else{
                            $("#err-msg").text("用户名或密码错误!")
                        }
                })
                .catch( err => {
                        console.log("error", err)
                })
            }
        
        }
    }

    const VueRooms = {
        data(){
            return {
                rooms: [],
                consts: false,
                room_id: 3,
                room_port: 5003,
                start_method: 1
            }
        },
        methods: {
            addRoom(){      
                console.log("addRoom")  
                ajax_prom({
                    url:'/majiang/admin/room/add', 
                    type: "POST",
                    contentType:"application/json",
                    dataType:"json",
                    data: JSON.stringify({
                        room_id: this.room_id,
                        port: this.room_port,
                        start_method: this.start_method})
                })
                .then( data => {
                    if(data.result == 0){
                        console.log("result:", data.rooms)
                        this.rooms = data.rooms
                    }
                })
                .catch( err => {
                    console.log("error", err)
                })
            },
            getRooms(){
                console.log("getRooms")
                ajax_prom({
                    url:'/majiang/admin/rooms', 
                    type: "GET",
                    contentType:"application/json",
                })
                .then(res => {
                    this.rooms = res.rooms
                    this.consts = res.consts
                })
            },
            onRoom(fangjian_hao, action){
                console.log("onRoom")
                app.comfirm.confirm_text = "此操作将改边房间状态, 影响房间所有牌桌, 请确认!"
                $("#button-confirm").off("click").click(
                    () => {
                        $.post(`/majiang/admin/room/${fangjian_hao}/${action}`).done(
                        (data) => {
                            $("#modal-comfirm").modal("hide")
                            this.rooms = data.rooms
                        })
                })
                $("#modal-comfirm").modal("show")
            }        
        }
    }

    const VueTables = {
        data(){
            return {
                tables: [],
                consts: false
            }
        },
        methods: {
            getPrivateTables(){
                ajax_prom({
                    url:'/majiang/admin/tables/private', 
                    type: "GET",
                    contentType:"application/json",
                })
                .then(res => {
                    this.tables = res.tables
                    this.consts = res.consts
                })
            },
            showPrivateModal(route, name, dialect, max_ju){
                console.log("showPrivateModal")
                app.private_table_edit.table_name = name
                app.private_table_edit.dialect_name = dialect
                app.private_table_edit.max_ju = max_ju
                app.private_table_edit.table_route = route        
                $("#modal-private").modal()
            },        
            getSharedTables(){
                ajax_prom({
                    url:'/majiang/admin/tables/shared', 
                    type: "GET",
                    contentType:"application/json",
                })
                .then(res => {
                    this.tables = res.tables
                    this.consts = res.consts
                })
            },
            makeShared(route){
                console.log("makeShared")
                app.comfirm.confirm_text = "将本牌桌从私有牌桌删除, 移入共享牌桌. 请确认!"
                $("#button-confirm").off("click").click(() => {
                    $.post(`/majiang/admin/table/${route}/share`).done(() =>  {
                        onTab("shared-tables")
                        $("#modal-comfirm").modal("hide")
                    })
                })        
                $("#modal-comfirm").modal("show")
            },
            makePrivate(route){
                console.log("makePrivate")
                app.comfirm.confirm_text = "将本牌桌从共享牌桌删除, 移入私有牌桌. 请确认!"
                $("#button-confirm").off("click").click(() => {
                    $.post(`/majiang/admin/table/${route}/privatize`).done(() =>  {
                        onTab("private-tables")
                        $("#modal-comfirm").modal("hide")

                    })
                })
                $("#modal-comfirm").modal("show")
            }
        }
    }

    const action_map = {}
    action_map[mjconst.ET_LAIZI] = "掷色子"
    action_map[mjconst.ET_FAPAI] = "发牌"
    action_map[mjconst.ET_MOPAI] = "摸牌"
    action_map[mjconst.ET_DAPAI] = "打牌"
    action_map[mjconst.ET_CHIPAI] = "吃牌"
    action_map[mjconst.ET_PENGPAI] = "碰牌"
    action_map[mjconst.ET_DAPAI_MINGGANG] = "明杠"
    action_map[mjconst.ET_MOPAI_MINGGANG] = "明杠"
    action_map[mjconst.ET_INSTANT_ANGANG] = "暗杠"
    action_map[mjconst.ET_DEFERED_ANGANG] = "暗杠"
    action_map[mjconst.ET_HUPAI] = "胡牌"
    action_map[mjconst.ET_HUPAI_END] = "得分"
    action_map[mjconst.ET_INIT_ACTION] = "叫牌"

    const VueDataFiles = {
        data(){
            return {
                data_files: {},
            }
        },

        updated(){
            $('.tree li:has(ul)').addClass('parent_li').find(' > span').attr('title', 'Collapse this branch');
            $('.tree li.parent_li > span').on('click', function (e) {
                var children = $(this).parent('li.parent_li').find(' > ul > li');
                if (children.is(":visible")) {
                    children.hide('fast');
                    $(this).attr('title', 'Expand this branch')
                    .addClass('glyphicon-folder-close')
                    .removeClass('glyphicon-folder-open');
                } else {
                    children.show('fast');
                    $(this).attr('title', 'Collapse this branch')
                    .addClass('glyphicon-folder-open')
                    .removeClass('glyphicon-folder-close');
                }
                e.stopPropagation();
            });

        },
        methods: {
            getDataFiles(){
                ajax_prom({
                    url:'/majiang/admin/data/files', 
                    type: "GET",
                    contentType:"application/json",
                })
                .then(data =>{
                    this.data_files = data
                })
            },
            showFileRecords(fangjian_hao, table_hao, start_time, ju_shu, filename){
                ajax_prom({
                    url:'/majiang/data/' + filename, 
                    type: "GET",
                    contentType:"application/json"
                })
                .then(data => {
                    if(data.length > 0){
                        app.data_file_records.file_records = []
                        app.data_file_records.filename = filename
                        app.data_file_records.paiju_info = 
                        `/房间(${fangjian_hao})/牌桌(${table_hao})/打牌时间(${start_time})/第${ju_shu+1}局`
                        data.forEach( (line,index) => {
                            if(index == 0){
                                app.data_file_records.dialect_name = line.dialect_name
                            }else{
                                let fang_name =  mjutils.getFangName(line.fang)
                                let action_name = action_map[line.action]
                                let param_text = this.getActionParamText(line.action, line.param)
                                app.data_file_records.file_records.push(
                                    {index, fang_name,action_name,param_text})
                            }
                        })
                    }
                })
                .catch(err => {
                        console.log("error", err)
                })        
            },

            //////////////////////////////////////////////////////////////////////////////////////
            //打牌记录文件, 文件数显示, 打牌记录显示等
            //////////////////////////////////////////////////////////////////////////////////////
            getActionParamText(type, params){
            let text_res = ''
            let face_list,face
            switch(type){
                case mjconst.ET_LAIZI:
                case mjconst.ET_MOPAI_MINGGANG:
                    face = new mjtable.Face(params[1])
                    text_res = `<span class="majiang-font">${face.getFontChar()}</span>`
                    break
                case mjconst.ET_MOPAI:
                case mjconst.ET_DAPAI:
                    face = new mjtable.Face(params)
                    text_res = `<span class="majiang-font">${face.getFontChar()}</span>`
                    break    
                case mjconst.ET_FAPAI:
                case mjconst.ET_PENGPAI:
                case mjconst.ET_INIT_ACTION:
                case mjconst.ET_DAPAI_MINGGANG:
                case mjconst.ET_INSTANT_ANGANG:
                case mjconst.ET_DEFERED_ANGANG:
                    face_list = []
                    params.forEach( index => {
                        face = new mjtable.Face(index)
                        face_list.push(face.getFontCharEx())
                    })
                    text_res =  `<span class="majiang-font">${face_list.join("")}</span>`
                    break
                case mjconst.ET_CHIPAI:
                    face_list = []
                    params[0].forEach( index => {
                        face = new mjtable.Face(index)
                        face_list.push(face.getFontChar())
                    })
                    text_res =  `<span class="majiang-font">${face_list.join("")}</span>`
                    break
                case mjconst.ET_HUPAI:
                    text_res = `基本分${params.hupai_info.base_score}`
                    break    
                case mjconst.ET_HUPAI_END:
                    text_res = ""
                    Object.keys(params.hupai_info.scores).forEach( key => {
                        text_res += ` ${mjutils.getFangName(key)}:${params.hupai_info.scores[key]}`
                    })
                    break
                }
                return text_res
            }
        }
    }

    const VueDataFileRecords = {
        data(){
            return {
                file_records:[],
                dialect_name: "",
                paiju_info: "",
                filename:""
            }
        },
        methods: {
            playback(){
                console.log("playback")
                if(!!this.filename){
                    if(window.location.href.includes("/admin/devel")){
                        window.open(`/majiang/playback/devel?${this.filename}`)
                    }else
                    if(window.location.href.includes("/admin")){
                        window.open(`/majiang/playback?${this.filename}`)
                    }
                }
            }
        }    
    }

    const VueCodeFiles = {
        data(){
            return {
                code_files: [],
            }
        },
        methods: {
            getCodeFiles(){
                ajax_prom({
                    url:'/majiang/admin/code/files', 
                    type: "GET",
                    contentType:"application/json",
                })
                .then(data =>{
                    this.code_files = data.file_list
                })
            },
            syncAllFiles(){
                ajax_prom({
                    url: '/majiang/admin/code/files/all/sync', 
                    type: "POST",
                    contentType: "application/json"
                })
                .then(data => {
                    if(data.result == 0){
                        this.code_files = data.file_list
                    }
                })
            },
        
            syncOneFile(foldname, filename){
                ajax_prom({
                    url: `/majiang/admin/code/files/${foldname}/${filename}/sync`, 
                    type: "POST",
                    contentType: "application/json"
                })
                .then(data => {
                    if(data.result == 0){
                        this.code_files = data.file_list
                    }
                })
            }            
        }
    }

    const VuePrivateTableEdit = {
        data(){
            return {
                table_route:0,
                table_name: "",
                dialect_name: "",
                max_ju: 0,
                dialects: mjtable.Table.dialect_list
            }
        },
        methods: {
            editPrivate(){        
                ajax_prom({
                    url:`/majiang/admin/table/${this.table_route}/edit`, 
                    type: "POST",
                    contentType:"application/json",
                    dataType:"json",
                    data: JSON.stringify({
                        name: this.table_name,
                        dialect: this.dialect_name,
                        max_ju: this.max_ju})
                })
                .then(data => {
                    if(data.result == 0){
                        $("#modal-comfirm").modal("hide")
                    }
                })
                .catch( err => {
                    console.log("error", err)
                })
            }
        
        }
    }

    return {
        login: Vue.createApp(VueLogin),
        rooms: Vue.createApp(VueRooms),
        private_tables: Vue.createApp(VueTables),
        shared_tables: Vue.createApp(VueTables),
        data_files: Vue.createApp(VueDataFiles),
        data_file_records: Vue.createApp(VueDataFileRecords),
        code_files: Vue.createApp(VueCodeFiles),
        comfirm: Vue.createApp({data(){return{confirm_text:""}}}),
        private_table_edit: Vue.createApp(VuePrivateTableEdit)
    }
    
})