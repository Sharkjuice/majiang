class DotDict(dict):
    """dot.notation access to dictionary attributes"""
    __getattr__ = dict.get
    __setattr__ = dict.__setitem__
    __delattr__ = dict.__delitem__

def dottify(data):
    dot_data = DotDict()
    dot_data.update(data)
    return dot_data
#房间在线状态
CONST = DotDict()
CONST.ONLINE = 1
#启动方式
CONST.AUTO_START = 0
CONST.MANUL_START = 1
CONST.NOT_START = 2


#牌桌状态
#座位人数
CONST.EMPTY = 0
CONST.ONE_PLAYER = 1
CONST.TWO_PLAYERS = 2
CONST.THREE_PLAYERS = 3
CONST.FOUR_PLAYERS = 4
#没有座位, 已经有4人(包括机器人)
#牌桌离线, 不可用
CONST.OFFLINE = 5
#牌桌类型
CONST.PROD = 0
CONST.DEVEL = 1

DEDAULT_DIALECT = "晃晃"
DEDAULT_JUSHU = 12

MAX_RECORD_FILES = 30

REFRESH_TIME = 900
ADMIN_PORT = 5000
MAIN_PORT = 4999

CMD_STRING = ["/home/xby/majiang/code/prod/node/main.js",
                "/home/xby/majiang/code/devel/node/main.js"]
DATA_ROOT = '/home/xby/majiang/data'

room_list = [
    dottify({"room_id": 1, "port": 5001, "status":CONST.OFFLINE, "blocked": False, 
        "ipaddr":"127.0.0.1", "start_method": CONST.AUTO_START, "managed":False, "type": CONST.PROD}),
    dottify({"room_id": 2, "port": 5002, "status":CONST.OFFLINE, "blocked": False, 
        "ipaddr": "127.0.0.1", "start_method": CONST.MANUL_START,"managed":False, "type": CONST.DEVEL})
]

private_table_list = [
    dottify({"room_id": 1, "table_id": 5, "route": 105, "name": "发财", 
    "status": CONST.EMPTY, "dialect": DEDAULT_DIALECT, "max_ju": DEDAULT_JUSHU}),
    dottify({"room_id": 2, "table_id": 5, "route": 205, "name": "运气", 
    "status": CONST.EMPTY, "dialect": DEDAULT_DIALECT, "max_ju": DEDAULT_JUSHU})
]
