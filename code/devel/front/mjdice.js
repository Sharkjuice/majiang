define(['../common/mjtable.js', '../common/mjutils.js'], function (mjtable, mjutils) {
let odice
function init() { 
  odice = document.querySelector('#dice')
 
  // 当骰子动画执行后
  odice.addEventListener('webkitAnimationEnd', () => {
     odice.style.animationName = 'none' // 更改动画属性，以待下一次动画的正常执行
     // 可能出现的情况集合
     let _posible = {
     1: {x: 0, y: 0},
     6: {x: 0, y: 180},
     3: {x: 0, y: -90},
     4: {x: 0, y: 90},
     5: {x: -90, y: 0},
     2: {x: 90, y: 0},
     }
     // 准备抽取的随机数
     // 抽取的随机结果
     let table = mjtable.Table.getDefault()
     if(!table){
        mjutils.Tips.show("已经退出牌桌")
        return 
     }
     let _result = _posible[table.dice_num]
     
     //setTimeout(() => { // 浏览器反应不过来加过渡
       // 让骰子旋转到正确的角度
       odice.style.transform = `rotateX(${ _result.x }deg) rotateY(${ _result.y }deg)` 
       mjutils.Tips.show("赖子是" + table.laizi.getFaceName())
       table.laizi.show()
       hideTheDice()
      //}, 0)
   })
 
}

 function rotate() { 
    $("#dice_modal").show()
  // 骰子转起来   
  // 有的时候浏览器在连续使用js操作css的时候会出现问题（反应不过来），比如，效果不能正常显示，此时可以尝试利用setTimeout-0来将目标代码放入到异步队列中等待执行
    odice.style.animationName = 'rotate'
 }
 function hideTheDice(){
    $("#dice_modal").hide()
  }
  

return {
  rotate, init    
}
})
