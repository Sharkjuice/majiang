# -*- coding: utf-8 -*-
from os import waitpid,listdir,path,remove
from shutil import copyfile
from datetime import datetime
import sys,atexit,signal,threading
from subprocess import Popen
from flask import Flask,jsonify,request, session
from flask import render_template, redirect
import requests,json
import conf, pdb

# 实例化，可视为固定格式
app = Flask(__name__)
#log = logging.getLogger('werkzeug')
#log.setLevel(logging.ERROR)

password = "Majiang12#$"
app.secret_key = 'why would I tell you my secret key?'

PROD_CODE_ROOT = '/home/xby/majiang/code/prod'
DEVEL_CODE_ROOT = '/home/xby/majiang/code/devel'
ADMIN_DATA_ROOT = '/home/xby/majiang/admin'
CODE_FOLDS = ['common', 'dialects', 'front', 'node']

shared_table_list = []
data_file_tree = {}
code_file_list = []
room_list = []
private_table_list = []

def init_data():
    global room_list, private_table_list
    file_obj = open(ADMIN_DATA_ROOT + '/data.json', 'r', encoding='utf-8')
    data = json.load(file_obj)
    file_obj.close()
    room_list = [conf.dottify(r) for r in data['room_list']]
    private_table_list = [conf.dottify(t) for t in data['private_table_list']]
    print(room_list)

def save_data():
    file_obj = open(ADMIN_DATA_ROOT + '/data.json', 'w', encoding='utf-8')
    json.dump({"room_list": room_list, "private_table_list": private_table_list}, file_obj)
    file_obj.close()


def order_route(filename):
    return filename.split("_")[0]

def order_time(filename):
    return "{}{:0>2d}{:0>2d}{:0>2d}{:0>2d}".format(
        *[int(i) for i in filename.split("_")[1].split("-")])



@app.route('/majiang/admin/devel')
@app.route('/majiang/admin')
def admin():
    if(session.get("authenticated") == True):
        return app.send_static_file('admin.html')
    else:
        return app.send_static_file('login.html')

@app.route('/majiang/admin/login', methods=["POST"])
def login():
    #pdb.set_trace()
    data = conf.dottify(request.json)
    if( data.username == "admin" and data.password == password):
        session['username'] = data.username
        session['authenticated'] = True
        session['remember_me'] = data.remember_me
        return jsonify({"result":0})
    else:
        return jsonify({"result":-1})


@app.route('/majiang/admin/logout', methods=["POST"])
def logout():
    session['username'] = "未登录"
    session['authenticated'] = False
    return jsonify({"result":0})

@app.route('/majiang/admin/rooms', methods=["GET"])
def get_rooms():
    return jsonify({"rooms":room_list, "consts":conf.CONST})


@app.route('/majiang/admin/tables/private', methods=["GET"])
def get_private_tables():
    return jsonify({"tables":private_table_list, "consts":conf.CONST})


@app.route('/majiang/admin/tables/shared', methods=["GET"])
def get_shared_tables():
    return jsonify({"tables": shared_table_list, "consts":conf.CONST})



@app.route('/majiang/admin/table/private/<name>/start/<int:number>', methods=["POST"])
def start_fix_table(name, number):
    resp = {}
    route = -1
    try: 
        route = int(name)
    except:
        route = -1

    for p in private_table_list:
        status = p.status + number
        if (p.route == route or p.name == name) and  status <= conf.CONST.FOUR_PLAYERS:
            resp = {"result":0, "route":  p.route, "name": p.name, "max_ju": p.max_ju,
                    "dialect": p.dialect}
            p.status = status
            break
    else:
        resp = {"result":-1}
    return jsonify(resp)    

@app.route('/majiang/admin/table/<int:route>/join/<int:number>', methods=["POST"])
def join_table(route, number):
    resp = {}
    for p in shared_table_list:
        status = p.status + number
        if  p.route == route and status <=  conf.CONST.FOUR_PLAYERS:
            resp = {"result":0, "route":  p.route,"name": p.name }
            p.status = status
            break
    else:
        for p in private_table_list:
            status = p.status + number
            if p.route == route and status <=  conf.CONST.FOUR_PLAYERS:
                resp = {"result":0, "route":  p.route,"name": p.name }
                p.status = status
                break
        else:
            resp = {"result":-1,"msg":"该牌桌未上线!"}
    return jsonify(resp)

            
@app.route('/majiang/admin/pool/<int:pool_type>/table/adhoc/start/<int:number>', methods=["POST"])
def start_adhoc_table(pool_type, number):
    resp = {}
    for p in shared_table_list:
        room = None
        for f in room_list:
            if f.room_id == p.room_id:
                room = f
                break
        else:
            print("error in start_adhoc_table, the room is not online: ", f.room_id)
        
        if room.type !=  pool_type:
            continue

        status = p.status + number
        if status <= conf.CONST.FOUR_PLAYERS:
            resp = {"result":0, "route":  p.route, "name": p.name, "max_ju":p.max_ju}
            p.status = status
            break
    else:
        resp = {"result":-1}
    return jsonify(resp)

@app.route('/majiang/admin/room/<int:room_id>/start/notify', methods=["POST"])
def start_room_notify(room_id):
    data = conf.dottify(request.json)
    for f in room_list:
        if f.room_id == room_id:
            f.status =  conf.CONST.ONLINE
            for key, status in data.items():
                table_id = int(key)
                set_table_status(room_id, table_id, status, True)
        
    return jsonify({"result":0})
        
@app.route('/majiang/admin/table/<int:route>/stop/notify', methods=["POST"])
def stop_table_notify(route):
    set_table_status(route//100, route%100, conf.CONST.EMPTY, False)
    return jsonify({"result":0})


@app.route('/majiang/admin/table/<int:route>/edit', methods=["POST"])
def table_edit(route):
    data = conf.dottify(request.json)
    for p in private_table_list:
        if p.route == route:
            p.name = data.name
            p.dialect = data.dialect
            p.max_ju = data.max_ju

            break
    else:
        return jsonify({"result":-1})
    save_data()
    return jsonify({"result": 0})        

@app.route('/majiang/admin/table/<int:route>/privatize', methods=["POST"])
def table_privatize_request(route):
    for p in shared_table_list:
        if p.route == route:
            shared_table_list.remove(p)
            break
    
    private_table_list.append(conf.dottify({
        "room_id": route//100,
        "table_id": route%5,
        "route": route,
        "name": str(route),
        "status": conf.CONST.EMPTY,
        "dialect": conf.DEDAULT_DIALECT,
        "max_ju": conf.DEDAULT_JUSHU
        }))
    return jsonify({"result":0})


@app.route('/majiang/admin/table/<int:route>/privatize', methods=["POST"])
def table_privatize(route):
    for p in shared_table_list:
        if p.route == route:
            shared_table_list.remove(p)
            break
    else:
        return jsonify({"result": -1})
    
    private_table_list.append(conf.dottify({
        "room_id": route//100,
        "table_id": route%5,
        "route": route,
        "name": str(route),
        "status": conf.CONST.EMPTY,
        "dialect": conf.DEDAULT_DIALECT,
        "max_ju": conf.DEDAULT_JUSHU
        }))
    save_data()
    return jsonify({"result":0})


@app.route('/majiang/admin/table/<int:route>/share', methods=["POST"])
def table_share(route):
    for p in private_table_list:
        if p.route == route:
            private_table_list.remove(p)
            break
    else:
        return jsonify({"result": -1})
    
    shared_table_list.append(conf.dottify({
        "room_id": route//100,
        "table_id": route%5,
        "route": route,
        "name": str(route),
        "status": conf.CONST.EMPTY,
        "max_ju": conf.DEDAULT_JUSHU
        }))
    save_data()
    return jsonify({"result":0})


@app.route('/majiang/admin/room/add', methods=["POST"])
def room_add():
    req_json = conf.dottify(request.json)
    room_list.append(conf.dottify({
        "room_id": req_json.room_id,
        "port": req_json.port,
        "status": conf.CONST.OFFLINE, 
        "blocked": False, 
        "ipaddr":"127.0.0.1", 
        "start_method": req_json.start_method, 
        "managed":False}))
    save_data()
    return jsonify({"result":0, "rooms":room_list})

@app.route('/majiang/admin/room/<int:room_id>/delete', methods=["POST"])
def room_delete(room_id):
    for f in room_list:
        if f.room_id == room_id:
            room_list.remove(f)
            break
    else:
        return jsonify({"result": -1})

    save_data()
    return jsonify({"result":0, "rooms":room_list})
    

@app.route('/majiang/admin/room/<int:room_id>/disable', methods=["POST"])
def room_disable(room_id):
    for f in room_list:
        if f.room_id == room_id:
            f.blocked = True
            break
    else:
        return jsonify({"result": -1})

    save_data()            
    return jsonify({"result":0, "rooms":room_list})    


@app.route('/majiang/admin/room/<int:room_id>/enable', methods=["POST"])
def room_enable(room_id):
    for f in room_list:
        if f.room_id == room_id:
            f.blocked = False
            break
    else:
        return jsonify({"result": -1})

    save_data()
    return jsonify({"result":0, "rooms":room_list})    

@app.route('/majiang/admin/room/<int:room_id>/start', methods=["POST"])
def room_start(room_id):
    result = -1
    for f in room_list:
        if f.room_id == room_id and  f.status == conf.CONST.OFFLINE:
            command_str = "{} {} {} {} {}".format("node", conf.CMD_STRING[f.type], f.port, room_id, ADMIN_PORT)
            try:
                worker = Popen(command_str, shell=True)
                workers.update({room_id: worker})
                f.managed = True
                result = 0
            except:
                result = -1            
            break
    else:
        result = -1
    return jsonify({"result":result, "rooms":room_list})


@app.route('/majiang/admin/room/<int:room_id>/stop', methods=["POST"])
def room_stop(room_id):
    result = -1
    for f in room_list:
        if  f.room_id == room_id and f.managed:
            try:
                workers[room_id].terminate()
                setFangjianOffline(f)
                result = 0
            except:
                setFangjianOffline(f)
                result = 0
            break
    else:
        result = -1
    return jsonify({"result":result, "rooms":room_list})


workers = {}
timer = None
 
def close_running_worker():
    timer.cancel()
    for _, worker in workers.items():
        worker.terminate()

def close_child(signum, frame):
    close_running_worker()

def wait_child(signum, frame):
    waitpid(-1,0)

def setFangjianOffline(f):
    f.managed = False
    f.status = conf.CONST.OFFLINE
    for p in private_table_list:
        if p.room_id == f.room_id:
            #print("setFangjianOffline", p.route, conf.CONST.OFFLINE)
            p.status  = conf.CONST.OFFLINE

    for p in shared_table_list:
        if p.room_id == f.room_id:
            #print("setFangjianOffline", p.route, conf.CONST.OFFLINE)
            p.status = conf.CONST.OFFLINE

def set_table_status(room_id, table_id, status, add_if_not_found):
    route = room_id*100 + table_id
    for p in private_table_list:
        if p.route == route:
            #print("set_table_status", p.route, status)
            p.status  = status
            break
    else:
        for p in shared_table_list:
            if p.route == route:
                p.status = status
                break
        else:
            if add_if_not_found:
                shared_table_list.append(conf.dottify({
                    "room_id": room_id,
                    "table_id": table_id,
                    "route": route,
                    "name": str(route),
                    "status":status,
                    "max_ju":conf.DEDAULT_JUSHU
                }))

signal.signal(signal.SIGCHLD, wait_child)
signal.signal(signal.SIGTERM, close_child)

def start_rooms():
    for f in room_list:
        if(f.start_method == conf.CONST.AUTO_START):
            command_str = "{} {} {} {} {}".format("node", conf.CMD_STRING[f.type], f.port,f.room_id,ADMIN_PORT)
            print("start:", command_str)
            try:
                worker = Popen(command_str, shell=True)
                workers.update({f.room_id: worker})
                f.managed = True
            except:
                print("start process error!")


def refresh_status():
    for f in room_list:
        #pdb.set_trace()
        room_id = f.room_id
        try:
            url = "http://{}:{}/status".format(f.ipaddr,f.port)
            resp = requests.get(url)
            data = resp.json()
            f.status = conf.CONST.ONLINE
            for key, status in data.items():
                table_id = int(key)
                set_table_status(room_id, table_id, status, True)
        except:
            f.status = conf.CONST.OFFLINE
            f.managed = False
            for p in private_table_list:
                if p.room_id == room_id:
                    p.status =  conf.CONST.OFFLINE
            for p in shared_table_list:
                if p.room_id == room_id:
                    p.status =  conf.CONST.OFFLINE

    start_rooms()
    timer = threading.Timer(conf.REFRESH_TIME, refresh_status)
    timer.start()

#########################################################################################
#打牌记录文件接口: 前段获取打牌记录文件, 从data目录获取, 生成文件树, 返回前台
#########################################################################################
@app.route('/majiang/admin/data/files')
def get_data_files():
    data_file_tree = {}
    list = listdir(conf.DATA_ROOT) #列出文件夹下所有的目录与文件
    list.sort(key=order_time, reverse=True)
    if len(list) > conf.MAX_RECORD_FILES:
        for filename in list[conf.MAX_RECORD_FILES:]:
            fullname = conf.DATA_ROOT + "/" + filename
            remove(fullname)
        list = list[0:conf.MAX_RECORD_FILES]

    list.sort(key=order_route)

    for filename in list:
        fullname = path.join(conf.DATA_ROOT,filename)
        if path.isfile(fullname):
            record_info_list = filename.split("_")
            table_route = int(record_info_list[0])
            room_id = table_route//100
            table_id = table_route%100
            start_time = record_info_list[1]
            table_ju_shu = int(record_info_list[2].split(".")[0])
            data_file_tree.setdefault(room_id,{})\
                .setdefault(table_id, {})\
                .setdefault(start_time, []).append((table_ju_shu,filename))
    return jsonify(data_file_tree)

@app.route('/majiang/data/<filename>', methods=["GET"])
def get_record(filename):
    fullname = path.join(conf.DATA_ROOT,filename)
    file_obj = open(fullname, "r")
    text = file_obj.read()
    file_obj.close()
    data = json.loads(text)
    return jsonify(data)

#########################################################################################
#同步文件接口: 同步开发状态和生产状态的文件
#########################################################################################
@app.route('/majiang/admin/code/files')
def get_code_files():
    code_file_list.clear()
    for foldname in CODE_FOLDS:
        files = listdir("{}/{}".format(DEVEL_CODE_ROOT, foldname))
        for filename in files:
            devel_filename = "{}/{}/{}".format(DEVEL_CODE_ROOT, foldname, filename)
            prod_filename = "{}/{}/{}".format(PROD_CODE_ROOT, foldname, filename)
            devel_mttime = path.getmtime(devel_filename)
            devel_mttime_fmt = datetime.fromtimestamp(devel_mttime).strftime("%Y-%m-%d %H:%M:%S")
            try:
                prod_mttime = path.getmtime(prod_filename)
                prod_mttime_fmt = datetime.fromtimestamp(prod_mttime).strftime("%Y-%m-%d %H:%M:%S")
            except FileNotFoundError as err:
                code_file_list.append(conf.dottify({
                    'foldname': foldname,
                    'filename': filename, 
                    'devel_time': devel_mttime_fmt,
                    'prod_time':  "文件不存在",
                }))
            else:
                if(prod_mttime < devel_mttime):
                    code_file_list.append(conf.dottify({
                        'foldname': foldname,
                        'filename': filename, 
                        'devel_time': devel_mttime_fmt,
                        'prod_time':  prod_mttime_fmt,
                    }))

    return jsonify({"result": 0, "file_list":code_file_list})

@app.route('/majiang/admin/code/files/all/sync', methods=["POST"])
def sync_all():
    for file_tuple in code_file_list:
        devel_filename = "{}/{}/{}".format(DEVEL_CODE_ROOT, file_tuple.foldname, file_tuple.filename)
        prod_filename = "{}/{}/{}".format(PROD_CODE_ROOT, file_tuple.foldname, file_tuple.filename)
        copyfile(devel_filename, prod_filename)    
    code_file_list.clear()
    return jsonify({"result": 0, "file_list":code_file_list})

# 把开发版本同步到生产版本
@app.route('/majiang/admin/code/files/<foldname>/<filename>/sync', methods=["POST"])
def sync_file(foldname, filename):
    devel_filename = "{}/{}/{}".format(DEVEL_CODE_ROOT, foldname, filename)
    prod_filename = "{}/{}/{}".format(PROD_CODE_ROOT, foldname, filename)
    copyfile(devel_filename, prod_filename)
    for (index, file) in enumerate(code_file_list):
        if file.foldname == foldname and  file.filename == filename:
            del(code_file_list[index])
            break
    return jsonify({"result": 0, "file_list":code_file_list})


ADMIN_PORT = conf.ADMIN_PORT

if __name__ == '__main__':
    if len(sys.argv) > 1:
        ADMIN_PORT = int(sys.argv[1])

    init_data()  
    #Register the function to be called on exit
    atexit.register(close_running_worker)
    #start your process
    start_rooms()
    timer = threading.Timer(conf.REFRESH_TIME, refresh_status)
    timer.start()
    app.run(host="127.0.0.1", port= ADMIN_PORT)

