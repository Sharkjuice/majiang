define(['../common/mjutils.js', './mjvoice.js', './mjgraph.js', './mjpai.js', './mjpaizhuo.js','./mjdice.js', 
'./mjuicontrol.js', './mjuiaction.js', '../dialects/list.js'], 
function (mjutils, mjvoice,mjgraph, mjpai, mjpaizhuo,mjdice, mjuicontrol,mjuiaction, _)
{

    function load() {
        mjvoice.init()
        if(mjgraph.init()){
            main.init()
        }else{
            console.log("竖屏")
        }
    }
    class main{
        static initialized = false    
        static init(){
            if(!this.initialized){
                mjpai.init(0)
                $("#tab_table").show()
                mjuicontrol.init()
                mjuiaction.init()
                mjpaizhuo.init()
                mjdice.init() 
                mjpaizhuo.display()
                mjgraph.rerender()
                this.initialized = true
            }
        }
    }

    function updateOrientation()
    {
        //只在苹果手机上执行
        //let screenWidth, screenHeight
        //screenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        //screenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        //mjutils.Tips.show(`W:${screenWidth};H:${screenHeight}`)

        switch(window.orientation)
        {
            case 0:
            case 180:
                //竖屏模式, 啥也不执行
                mjutils.Tips.show("请横屏操作")
            break;
            case -90:
            case 90:
                //横屏模式, 只执行一些初始化
                if(!main.initialized){                    
                    mjgraph.init()
                    main.init()
                }
            break;
        }
    }
    window.updateOrientation = updateOrientation
    load()    
})