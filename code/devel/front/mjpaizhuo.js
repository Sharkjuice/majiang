define(['../common/mjutils.js','./mjgraph.js'], 
function (mjutils, mjgraph) {
    let ar,zhuoziWidth,zhuoziHeight,pw1,ph2,ph1,scene,scale,em
    function init(thenCall){
        let factors = mjgraph.getFactors()
        ar = factors.ar
        scale = factors.scale
        em = factors.em
        let size = mjgraph.getPaizhuoSize()
        zhuoziWidth = size.width
        zhuoziHeight = size.height
        size = mjgraph.getPaiSize1()
        pw1 = size.width
        ph1 = size.height
        size = mjgraph.getPaiSize2()
        pw2 = size.width
        ph2 = size.height
        pd2 = size.depth
        scene = mjgraph.getScene()
        initFontText(thenCall) 
    }

    const mopaiqu = []
    const dapaiqu = []
    const fangwei_hanzi = []
    const hupai_hanzi = []
    const zhongxinqu = []
    var fangwei_text = null
    var hupai_text = null

        //显示球桌
    function display(){
        const geometry1 = new THREE.ExtrudeGeometry( drawZhuokuang(), 
            {amount :20,bevelEnabled: false} );        
        const material1 = new THREE.MeshLambertMaterial( { color: 0x956550} );
        const mesh1 = new THREE.Mesh( geometry1, material1) ;  
        mesh1.name = "zhuokuang"

        const geometry2 = new THREE.ShapeGeometry(drawZhuomian());

        const materials2 = new THREE.MeshPhongMaterial({color: 0x064916});
            
        const mesh2 = new THREE.Mesh( geometry2, materials2) ; 
        mesh2.name = "zhuomian"
        
        const group = new THREE.Group()
        group.add(mesh1)
        group.add(mesh2)
        scene.add(group)
        group.name = "zhuozi"
        makeMopaiqu()
        makeDapaiqu() 
        makeZhongxinqu()
    }
    function hilightTextFang(wei){
        zhongxinqu.forEach( (fangwei_qu,index) => {
            if (wei == index){
                fangwei_qu.color.set(0x93652a)
            }else{
                fangwei_qu.color.set(0x5a425a)
            }
        })
        mjgraph.rerender()
    }

    function cancelHilightTextFang(){
        zhongxinqu.forEach( fangwei_qu => {
            fangwei_qu.color.set(0x5a425a)
        })
        mjgraph.rerender()
    }

    //显示四个字中的一个字
    function showTextFang(fang){  
        fangwei_hanzi.forEach( (hanzi,index) => {
            if (fang == index){
                hanzi.visible = true
            }
        })
        mjgraph.rerender()
    } 
    //中心去放 东南西北四个字, 但不显示,根据牌友的位置放置,保证当前牌友放在屏幕底
    function placeTextFang(fang){
        if(fangwei_text != null){
            fangwei_text.rotation.set(0,0, -fang*Math.PI/2)
            fangwei_text.visible = true
        }
    }

    function hideTextFang(){  
        if(fangwei_text != null){
            fangwei_text.visible = false            
        }
        fangwei_hanzi.forEach( hanzi => {
            hanzi.visible = false
        })
        mjgraph.rerender()
    }

    function showTextHupai(wei){  
        hupai_text.rotation.set(0,0,wei*Math.PI/2)
        hupai_text.visible = true
        mjgraph.rerender()        
    }
    function hideTextHupai(){ 
        if( hupai_text){
            hupai_text.visible = false 
            mjgraph.rerender()      
        }  
    }    

    //画牌面， 840x840
    function drawZhuomian() {
        // create a basic shape
        var shape = mjgraph.rectShape(zhuoziWidth - 40,zhuoziHeight - 40)      
        return shape;
    }     

    function drawZhuokuang() {
        // create a basic shape
        const shape = mjgraph.rectShape(zhuoziWidth,zhuoziHeight)
        const hole = mjgraph.rectHole(zhuoziWidth - 40,zhuoziHeight - 40)

        shape.holes = [hole]

        // return the shape
        return shape;
    }     
    //中心画东南西北
    function makeMopaiqu() {
        let groupWo = new THREE.Group()
        let groupYou = new THREE.Group()
        let groupDui = new THREE.Group()
        let groupZuo = new THREE.Group()
        groupWo.position.set(20+0.5*pw1-zhuoziWidth/2, 20+0.5*ph1-zhuoziHeight/2, 0.1)
        //因为透视的原因, 牌显示不全, 这里用了30,把牌往左边移动一点
        groupYou.position.set(zhuoziWidth/2-30-pd2, 20+0.5*pw2-zhuoziHeight/2, 20.1)
        groupDui.position.set(zhuoziWidth/2-20-0.5*pw2, zhuoziHeight/2-20-pd2, 20.1)    
        groupZuo.position.set(-zhuoziWidth/2+30+pd2+ 6*em/scale, zhuoziHeight/2-20-0.5*pw2, 20.1)
        console.log('makeMopaiqu', em, scale)

        scene.add(groupWo)
        scene.add(groupYou)
        scene.add(groupDui)
        scene.add(groupZuo)
        mopaiqu.push(groupWo,groupYou,groupDui,groupZuo)
    }

    function makeDapaiqu(){
        let groupWo = new THREE.Group()
        let groupYou = new THREE.Group()
        let groupDui = new THREE.Group()
        let groupZuo = new THREE.Group()

        groupWo.position.set(-4.5*pw2, -0.5*ph2-95 , 0.1)
        groupYou.position.set(5*pw2+2+0.5*ph2 , 0.5*pw2-2*ph2-95, 0.1)
        groupDui.position.set(4.5*pw2, 10*pw2-3.5*ph2-95, 0.1)    
        groupZuo.position.set(-5*pw2-2-0.5*ph2, 9.5*pw2-2*ph2-95, 0.1)

        scene.add(groupWo)
        scene.add(groupYou)
        scene.add(groupDui)
        scene.add(groupZuo)
        dapaiqu.push(groupWo,groupYou,groupDui,groupZuo)
    }


    //中心画东南西北
    function makeZhongxinqu() {
        // create a basic shape
        const geometry0 = new THREE.ShapeGeometry(mjgraph.rectShape(60,60));
        const geometry1 = geometry0.clone()
        const geometry2 = geometry0.clone()
        const geometry3 = geometry0.clone()
        const geometry4 = geometry0.clone()

        // //贴图图案中的29，30,31,32是南西北
        const material0 = new THREE.MeshBasicMaterial( { color: 0x000000 } );
        const material1 = new THREE.MeshBasicMaterial( { color: 0x5a425a } );
        const material2 = new THREE.MeshBasicMaterial( { color: 0x5a425a } );
        const material3 = new THREE.MeshBasicMaterial( { color: 0x5a425a } );
        const material4 = new THREE.MeshBasicMaterial( { color: 0x5a425a } );
        const mesh0 = new THREE.Mesh( geometry0, material0) ; 
        const mesh1 = new THREE.Mesh( geometry1, material1) ; 
        const mesh2 = new THREE.Mesh( geometry2, material2) ; 
        const mesh3 = new THREE.Mesh( geometry3, material3) ; 
        const mesh4 = new THREE.Mesh( geometry4, material4) ;  
        const mesh5 = new THREE.Mesh( geometry0, material0) ; 
        const mesh6 = new THREE.Mesh( geometry0, material0) ; 
        const mesh7 = new THREE.Mesh( geometry0, material0) ; 
        const mesh8 = new THREE.Mesh( geometry0, material0) ; 

        mesh1.position.set(60, 0, 0.1)
        mesh2.position.set(0, 60, 0.1)
        mesh3.position.set(-60, 0, 0.1)
        mesh4.position.set(0, -60, 0.1)
        mesh5.position.set(60, 60, 0.1)
        mesh6.position.set(60, -60, 0.1)
        mesh7.position.set(-60, -60, 0.1)
        mesh8.position.set(-60, 60, 0.1)

        scene.add(mesh0)
        scene.add(mesh1)
        scene.add(mesh2)
        scene.add(mesh3)
        scene.add(mesh4)
        scene.add(mesh5)
        scene.add(mesh6)
        scene.add(mesh7)
        scene.add(mesh8)
        
        zhongxinqu.push(material4,material1,material2, material3)
    }     



    //支持这些汉字:东南西北胡碰吃摸牌
    function initFontText(thenCall) {
    var textLoader = new THREE.FontLoader()
    textLoader.load(
        '/fonts/STLiti_Regular.json',
        function (font) {
        mjutils.Tips.show("加载字体...")
        const materialFront = new THREE.MeshBasicMaterial( { color: 0xba9ac3 } );
        const materialFront_HUPAI = new THREE.MeshBasicMaterial( { color: 0xff2030 });
        const materialSide = new THREE.MeshBasicMaterial( { color: 0x000088 } );
        const materialSide_HUPAI = new THREE.MeshBasicMaterial( { color: 0xffd700} );
        const materialArray = [ materialFront, materialSide ];
        const materiaArray_HUPAI = [materialFront_HUPAI,materialSide_HUPAI]
        var textGeom = new THREE.TextGeometry( '东', 
            {
                size: 40, height: 2, weight: 'normal',curveSegments: 10,
                font: font,
                style: "normal",
                bevelThickness: 1, bevelSize: 2, bevelEnabled: false,
                material: 0, extrudeMaterial: 1
            });

        const textDong = new THREE.Mesh(textGeom, materialArray );

        var textGeom = new THREE.TextGeometry( '南', 
        {
            size: 40, height: 2, weight: 'normal',curveSegments: 10,
            font: font,
            style: "normal",
            bevelThickness: 1, bevelSize: 2, bevelEnabled: false,
            material: 0, extrudeMaterial: 1
        });

        const textNan = new THREE.Mesh(textGeom, materialArray );
        var textGeom = new THREE.TextGeometry( '西', 
        {
            size: 40, height: 2, weight: 'normal',curveSegments: 10,
            font: font,
            style: "normal",
            bevelThickness: 1, bevelSize: 2, bevelEnabled: false,
            material: 0, extrudeMaterial: 1
        });

        const textXi = new THREE.Mesh(textGeom, materialArray );
        var textGeom = new THREE.TextGeometry( '北', 
        {
            size: 40, height: 2, weight: 'normal',curveSegments: 10,
            font: font,
            style: "normal",
            bevelThickness: 1, bevelSize: 2, bevelEnabled: false,
            material: 0, extrudeMaterial: 1
        });

        const textBei = new THREE.Mesh(textGeom, materialArray );


        var textGeom = new THREE.TextGeometry( '胡', 
            {
                size: 40, height: 2, weight: 'normal',curveSegments: 10,
                font: font,
                style: "normal",
                bevelThickness: 1, bevelSize: 4, bevelEnabled: true,
                material: 0, extrudeMaterial: 1
            });

        const textHu = new THREE.Mesh(textGeom, materiaArray_HUPAI);
        var textGeom = new THREE.TextGeometry( '牌', 
            {
                size: 40, height: 2, weight: 'normal',curveSegments: 10,
                font: font,
                style: "normal",
                bevelThickness: 1, bevelSize: 4, bevelEnabled: true,
                material: 0, extrudeMaterial: 1
            });

        const textPai = new THREE.Mesh(textGeom, materiaArray_HUPAI);

        fangwei_hanzi.push(textDong, textNan, textXi, textBei)
        hupai_hanzi.push(textHu,textPai)
        fangwei_text = makeFangweiText()
        hupai_text = makeHupaiText()
        mjutils.Tips.show("加载字体完毕!")
        if(thenCall){
            thenCall()
        }
    })}

    function makeFangweiText(){
        fangwei_hanzi[0].position.set(-27, -75, 0)
        fangwei_hanzi[1].position.set(75, -27, 0)
        fangwei_hanzi[1].rotateZ(Math.PI/2)
        fangwei_hanzi[2].position.set(27, 75, 0)
        fangwei_hanzi[2].rotateZ(Math.PI)
        fangwei_hanzi[3].position.set(-75, 27, 0)         
        fangwei_hanzi[3].rotateZ(-Math.PI/2)

        fangwei_hanzi[0].visible = false
        fangwei_hanzi[1].visible = false
        fangwei_hanzi[2].visible = false
        fangwei_hanzi[3].visible = false

        const group = new THREE.Group()
        group.add(fangwei_hanzi[0])
        group.add(fangwei_hanzi[1])
        group.add(fangwei_hanzi[2])
        group.add(fangwei_hanzi[3])
        group.translateZ(0.2)
        group.visible = false
        scene.add(group)
        return group
    }

    function makeHupaiText(){
        hupai_hanzi[0].position.set(-87, -75, 0)
        hupai_hanzi[1].position.set(33, -75, 0)        

        const group = new THREE.Group()
        group.add(hupai_hanzi[0])
        group.add(hupai_hanzi[1])
        group.translateZ(0.3)
        group.visible = false
        scene.add(group)  
        return group  
    }


    return {
        init,display,showTextHupai, hideTextHupai,hideTextFang,placeTextFang,showTextFang,
        hilightTextFang, cancelHilightTextFang, mopaiqu, dapaiqu
    }

})