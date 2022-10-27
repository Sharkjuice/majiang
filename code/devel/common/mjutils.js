define(["./mjconst.js"], function (mjconst) {

    function getPaiList(pai_list){
        let face_list_flat = []
        pai_list.forEach( face => {
            if(face){
                face_list_flat.push(face.getFaceName())
            }else{
                face_list_flat.push("无效牌")
            }
        })
        return face_list_flat.join(",")
    
    }
    
    function getIndexList(pai_list){
        let face_list_flat = []
        pai_list.forEach( face => {
            if(face){
                face_list_flat.push(face.index)
            }else{
                face_list_flat.push(-1)
            }
        })
        return face_list_flat
    }
    
    //获得我的绝对方位
    
    const fang_map = {0:"东边", 1:"南边", 2:"西边", 3:"北边"}
    function getFangName(fang){
        let fang_hanzi = fang_map[fang]
        if(fang_hanzi){
            return fang_hanzi
        }else{
            return "--"
        }
    }
    
    
    function getUniqueId(){
        let len = 8;
        let $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
        let maxPos = $chars.length
        let id = ''
        for(let i = 0; i < len; i++) {
            id += $chars.charAt(Math.floor(Math.random() * maxPos));
        }
        return id
    }
    
    function getReqestType(can_hu, can_gang, can_peng,can_chi){
        return  can_hu?mjconst.ET_HU_REQUEST:(
                can_gang?mjconst.ET_DAPAI_MINGGANG_REQUEST:(
                can_chi?mjconst.ET_CHI_REQUEST:(
                can_peng?mjconst.ET_PENG_REQUEST:mjconst.ET_MO_REQUEST)))
    }
    
    function getHupaiType(ting_type, mo){
        return (ting_type==mjconst.TING_7_DUI)?mjconst.HU_7_DUI:(
               mo?mjconst.HU_ZIMO:mjconst.HU_DAPAI)
    }
    
    function getHupaiTypeName(hu_type){
        return (hu_type==mjconst.HU_7_DUI)?"七对":(
               (hu_type==mjconst.HU_ZIMO)?"自摸":"胡牌")
    }
    function promisify(api){
        return (options, ...params) => {
          return new Promise((resolve, reject) => {
            api(Object.assign({}, options, { success: resolve, fail: reject }), ...params);
          });
        }
      }
    
    let isSafari = false
    if(typeof navigator != 'undefined'){
        isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);  
    }
      
    class Tips {
        static MSG_LIST = []
        static MSG_ROWS = 2  

        static setRows(rows){
            this.MSG_ROWS = rows
        }
        static show(msg){
            if(this.MSG_LIST.length < this.MSG_ROWS){
                this.MSG_LIST.push(msg)
            }else{
                this.MSG_LIST.shift()
                this.MSG_LIST.push(msg)
            }
            //$("#text_messages").text(this.MSG_LIST.join('\n'))
            $("#text_messages").val(this.MSG_LIST.join('\n'))

        }

        static clear(){
            $("#text_messages").val("")
            this.MSG_LIST = []
        }
    
    }
    
    return {getPaiList,getIndexList,getFangName, getHupaiTypeName, getUniqueId, 
        getReqestType, getHupaiType, promisify, isSafari,Tips}
    
    })