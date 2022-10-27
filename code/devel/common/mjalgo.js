define(["./mjconst.js"], function (mjconst) {

function testChi(pai_list){ 
    let a = pai_list[0], b = pai_list[1], c = pai_list[2]
    if ((b.face -a.face) == 1 && (c.face - b.face) == 1) {
        return 0
    }
    if ((b.face - a.face) == 1) {
        return 1
    }

    if ((b.face - a.face) == 2){
        return 2
    }
    
    if ((c.face - b.face) == 1){
        return 3
    }
    if ((c.face - b.face) == 2){
        return 4
    }
    return -1
} 


function testPeng(pai_list){ 
    let a = pai_list[0], b = pai_list[1], c = pai_list[2]
    if ((b.face == a.face && c.face == b.face)) {
        return 0
    }
    if (b.face == a.face)  {
        return 1
    }
    if ((c.face == b.face)) {
        return 2
    }
    return -1
} 
function testGang(pai_list){ 
    let a = pai_list[0], b = pai_list[1], c = pai_list[2], d = pai_list[3]
    if (b.face == a.face && c.face == b.face && d.face == c.face) {
        return 0
    }
    return -1
} 

function doIteration(face_list, total_path, total_data, total_score,this_path, this_data, seq_type, f_list, i_list, level,score){
    this_path[level] = seq_type
    this_data[level] = f_list
    let new_face_list = face_list.slice()

    let this_score = 0 

    f_list.forEach( (face, index) => {
        new_face_list.splice(i_list[index], 1)
        this_score += face.face
    })

    this_score = this_score*Math.pow(10, seq_type) + score

    level++
    searchChiPengJiang(new_face_list, total_path, total_data, total_score, this_path, this_data,level,this_score)
    this_path.splice(level)
    this_data.splice(level)
    level--    
}

function getDistinctTriple(pai_list, index_list){
    let start_face = -1
    let triple = []
    let count = pai_list.length, triple_count = 0
    for(let i=0; i<count;i++){
        let pai = pai_list[i]
        if(pai.face != start_face){
            triple.push(pai)
            index_list.push(i)
            start_face = pai.face
            triple_count++
            if(triple_count == 3){
                break
            }
        }
    }
    if(triple_count == 3){        
        return triple
    }else{
        return false
    }
}

function getNextN(pai_list, n){
    let count = pai_list.length
    if(count < n){
        return false
    }
    return pai_list.slice(0,n)
}

function searchChiPengJiang(face_list, total_path, total_data, total_score, this_path, this_data, level,score){
    //console.log("Current search level: ", level)
    //logFaceList(face_list)
    let res, pai_list

    //找吃的
    var index_list = []
    pai_list = getDistinctTriple(face_list,index_list) 
    if (!!pai_list){
        res = testChi(pai_list) 
        let f0 = pai_list[0], f1 = pai_list[1], f2 = pai_list[2]
        let i0 = index_list[0], i1 = index_list[1], i2 = index_list[2]
        switch(res){    
        case 0:    
            doIteration(face_list, total_path, total_data, total_score, this_path, this_data, mjconst.SEQ_CHI, pai_list, [i2, i1, i0], level, score)
            doIteration(face_list, total_path, total_data, total_score, this_path, this_data, mjconst.SEQ_CHI_SIDE, [f1,f2], [i2, i1], level, score)
            doIteration(face_list, total_path, total_data, total_score, this_path, this_data, mjconst.SEQ_CHI_SIDE, [f0, f1], [i1, i0], level, score)
            doIteration(face_list, total_path, total_data, total_score, this_path, this_data, mjconst.SEQ_CHI_MID, [f0, f2], [i2, i0], level, score)
            break
        case 1:
            doIteration(face_list, total_path, total_data, total_score, this_path, this_data, mjconst.SEQ_CHI_SIDE,[f0,f1], [i1, i0], level, score)
            break
        case 2:
            doIteration(face_list, total_path, total_data, total_score, this_path, this_data, mjconst.SEQ_CHI_MID,[f0,f1], [i1, i0], level, score)
            break    
        case 3:
            doIteration(face_list, total_path, total_data, total_score, this_path, this_data, mjconst.SEQ_CHI_SIDE,[f1,f2], [i2, i1], level, score)
            break
        case 4:
            doIteration(face_list, total_path, total_data, total_score, this_path, this_data, mjconst.SEQ_CHI_MID, [f1, f2], [i2, i1], level, score)
            break    
        }
    }              

    pai_list = getNextN(face_list, 4) 
    if (!!pai_list){
        res = testGang(pai_list)
        if( res == 0){
            doIteration(face_list, total_path, total_data, total_score, this_path, this_data, mjconst.SEQ_AN_GANG, pai_list, [3,2,1,0], level, score)
        }
    }

    pai_list = getNextN(face_list, 3) 
    if (!!pai_list){
        res = testPeng(pai_list)
        switch(res){    
        case 0:
            doIteration(face_list, total_path, total_data, total_score, this_path, this_data, mjconst.SEQ_PENG, pai_list, [2,1,0], level, score)
            break
        case 1:
            doIteration(face_list, total_path, total_data, total_score, this_path, this_data, mjconst.SEQ_JIANG, pai_list.slice(0,2), [1, 0], level, score)
            break
        case 2:
            doIteration(face_list, total_path, total_data, total_score, this_path, this_data, mjconst.SEQ_JIANG, pai_list.slice(1), [2,1], level, score)
            break
            }
    }

    pai_list = getNextN(face_list, 2) 
    if (!!pai_list){ 
        let diff = pai_list[1].face - pai_list[0].face
        //看能不能配对子
        switch(diff){
        case 0:
            doIteration(face_list, total_path, total_data, total_score, this_path, this_data, mjconst.SEQ_JIANG, pai_list, [1,0], level, score)
            break
        case 1:
            doIteration(face_list, total_path, total_data, total_score, this_path, this_data, mjconst.SEQ_CHI_SIDE, pai_list, [1,0], level, score)
            break
        case 2:
            doIteration(face_list, total_path, total_data, total_score, this_path, this_data, mjconst.SEQ_CHI_MID, pai_list, [1,0], level, score)
            break
        }
    }

    pai_list = getNextN(face_list, 1) 
    if (!!pai_list){ 
        doIteration(face_list, total_path, total_data, total_score, this_path, this_data, mjconst.SEQ_SINGLE, pai_list, [0], level, score)
    }        

    if(face_list.length == 0){   
        total_path.push(this_path.slice())
        total_data.push(this_data.slice())
        total_score.push(score)
        //console.log("current search level end! ")
    } 
}


return  {
    //公共函数
    searchChiPengJiang, testChi, testPeng
    }
})