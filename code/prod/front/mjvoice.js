define(['../common/mjutils.js'], 
function (mjutils) {
    let dapai_voice_filenames = []
    let count_9 = [1,2,3,4,5,6,7,8,9]
    count_9.forEach(shu => {dapai_voice_filenames.push([`tong_${shu}`, `${shu}筒`])})
    count_9.forEach(shu => {dapai_voice_filenames.push([`tiao_${shu}`, `${shu}条`])})
    count_9.forEach(shu => {dapai_voice_filenames.push([`wan_${shu}`,  `${shu}萬`])})
    //中/發/東/南/西/北/白板
    dapai_voice_filenames.push(
        ["feng_hongzhong", "红中"],["feng_facai", "發財"],["feng_dongfeng", "东风"],
        ["feng_nanfeng", "南风"], ["feng_xifeng", "西风"],
        ["feng_beifeng", "北风"],["feng_baiban", "白板"],)

    let other_voice_filenames = [
        ["dapai_chi", "吃牌"], ["dapai_peng", "碰牌"], ["gang_ming", "明杠"],
        ["gang_an", "暗杠"], ["dapai_hu", "胡牌"], ["hupai_qidui", "七对"],
        ["hupai_zimo", "自摸"], ["quick_dapai", "快点打牌"], ["join", "加入"],
        [ "quit", "退出"], ["stop", "停止打牌"], ["gameover","有事不玩了"]
    ]

    const dapai_voices = {}
    const other_voices = {}
    const audio_null = {
        duration: 1.5,
        play: () => {
            console.log("The voice is not loaded. Do nothing.")}
        }

    function getDapaiVoice(key){        
        let voice = dapai_voices[key]
        if(!voice){
            audio = $(`#audio-dapai-${key}`)[0]
            if(!!audio){
                voice = new Voice(audio)
                dapai_voices[key] = voice        
            }else{
                voice = voice_null
            }
        }
        return voice
    }

    function getOtherVoice(key){
        let voice = other_voices[key]
        if(!voice){
            audio = $(`#audio-other-${key}`)[0]
            if(!!audio){
                voice = new Voice(audio)
                other_voices[key] = voice        
            }else{
                voice = voice_null
            }
        }
        return voice
    }
    let other_voice_count = 0
    let dapai_voice_count = 0
    function refreshOtherVoice(key){
        mjutils.Tips.show(`加载${other_voice_filenames[key][1]}`)
        let audio = $(`#audio-other-${key}`)[0]
        let voice = new Voice(audio)
        other_voices[key] = voice
        other_voice_count++
    }

    function refreshDapaiVoice(key){
        mjutils.Tips.show(`加载${dapai_voice_filenames[key][1]}`)
        let audio = $(`#audio-dapai-${key}`)[0]
        let voice = new Voice(audio)
        dapai_voices[key] = voice
        dapai_voice_count++
    }

    function isVoiceReady(){
        return dapai_voice_count == other_voice_filenames.length && 
            dapai_voice_filenamesother_voice_count == dapai_voice_filenames.length
    }
    function init(){
        let audio_list_html = []
        let suffix = mjutils.isSafari?"mp3":"ogg"
        other_voice_filenames.forEach( (filename,index) => {
            let url = `/audio/${suffix}/${filename[0]}.${suffix}`
            let audio_html = `<audio id=audio-other-${index} preload=auto ` +
                `onloadeddata=refreshOtherVoice(${index}) src=${url}></audio>`
            audio_list_html.push(audio_html)
        })

        dapai_voice_filenames.forEach( (filename,index) => {
            let url = `/audio/${suffix}/${filename[0]}.${suffix}`
            let audio_html = `<audio id=audio-dapai-${index} preload=auto ` +
            ` onloadeddata=refreshDapaiVoice(${index}) src=${url}></audio>`
            audio_list_html.push(audio_html)
        })
        $('#dapai-sounds').html(audio_list_html.join("\n"))
    }


    class Voice{
        constructor(audio){
            this.audio = audio
            this.isPlaying = false
            this.duration = audio.duration            
            this.onended = () => {this.isPlaying = false}
        }

        onEnded(callback){
            this.onended = callback.bind(this)
        }

        play(){
            if(this.isPlaying){
                console.log("Error, this sound is playing.")
                return
            }
            this.audio.play()
            this.isPlaying = true
            setTimeout(this.onended, this.duration*1000)
        }
    }
  
    const voice_null = new Voice(audio_null)
    
    function callAfterPlay(voice, func, ...params){
        if(voice){
            if(!voice.isPlaying){
                voice.onEnded(() => {
                        voice.isPlaying = false 
                        func(...params)
                    })
                voice.play()
                return                         
            }
        }
        setTimeout(() => func(...params), 1500)
    }

    window.refreshOtherVoice = refreshOtherVoice
    window.refreshDapaiVoice = refreshDapaiVoice

    return {init, getDapaiVoice,getOtherVoice,callAfterPlay, isVoiceReady}

})