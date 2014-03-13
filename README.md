#HuploadifyV2.0
###支持断点续传功能的HTML5文件上传插件
==========

jQuery文件上传插件，HTML5版uploadify，保持与uploadify一致的API，完全山寨。Uploadify官网：[http://www.uploadify.com/](http://www.uploadify.com/)

在V2.0版本中，实现了文件的断点续传功能，这样在上传大文件的时候，就不用担心中途中断后重新从头再上传的麻烦了。为满足最大的灵活性，保存已上传文件大小和获取已上传文件大小的函数将由你来定义，你可以使用localStorage保存在本地，或者发送ajax请求保存在服务器上。

#####已实现的特性有：
1. 多文件上传
2. 显示进度条
3. 显示已上传文件大小和百分比
4. 文件后缀名和文件大小检测
5. 向服务端提交额外数据
6. 自定义文件队列中的html模板
7. css样式分离出单独文件，可自己定制样式
8. 添加文件上传各阶段的回调函数
9. 断点续传

------------

#####已实现常用的API，default配置信息如下：
    fileTypeExts:'*.*',//允许上传的文件类型，格式'*.jpg;*.doc'
    uploader:'',//文件提交的地址
    auto:false,//是否开启自动上传
    method:'post',//发送请求的方式，get或post
    multi:true,//是否允许选择多个文件
    formData:null,//发送给服务端的参数，格式：{key1:value1,key2:value2}
    fileObjName:'file',//在后端接受文件的参数名称，如PHP中的$_FILES['file']
    fileSizeLimit:2048,//允许上传的文件大小，单位KB
    showUploadedPercent:true,//是否实时显示上传的百分比，如20%
    showUploadedSize:false,//是否实时显示已上传的文件大小，如1M/2M
    buttonText:'选择文件',//上传按钮上的文字
    removeTimeout: 1000,//上传完成后进度条的消失时间，单位毫秒
    itemTemplate:itemTemp,//上传队列显示的模板
    breakPoints:false,//是否开启断点续传
    fileSplitSize:1024*1024,//断点续传的文件块大小，单位Byte，默认1M
    getUploadedSize:null,//类型：function，自定义获取已上传文件的大小函数，用于开启断点续传模式，可传入一个参数file，即当前上传的文件对象，需返回number类型
    saveUploadedSize:null,//类型：function，自定义保存已上传文件的大小函数，用于开启断点续传模式，可传入两个参数：file：当前上传的文件对象，value：已上传文件的大小，单位Byte
    onUploadStart:null,//上传开始时的动作
    onUploadSuccess:null,//上传成功的动作
    onUploadComplete:null,//上传完成的动作
    onUploadError:null, //上传失败的动作
    onInit:null,//初始化时的动作
    onCancel:null//删除掉某个文件后的回调函数，可传入参数file
    onClearQueue:null,//清空上传队列后的回调函数，在调用cancel并传入参数*时触发
    onDestroy:null,//在调用destroy方法时触发
    onSelect:null,//选择文件后的回调函数，可传入参数file
    onQueueComplete:null//队列中的所有文件上传完成后触发
#####使用方法

断点续传功能依赖四个配置参数，分别是：
    breakPoints : ture|false  是否开启断点续传，如果设为false，则插件与1.0版本表现一致。
    fileSplitSize : number  断点续传的文件块大小，单位Byte，默认1M
     getUploadedSize : function  自定义获取已上传文件的大小函数，用于开启断点续传模式，可传入一个参数file，即当前上传的文件对象，需返回number类型
    saveUploadedSize : function  类型：function，自定义保存已上传文件的大小函数，用于开启断点续传模式，可传入两个参数：file：当前上传的文件对象，value：已上传文件的大小，单位Byte

下面是简单的使用localStorage进行断点本地保存的示例。首先页面上需要一个容器，通常是一个div，如：

`<div id="upload"></div>`

然后调用插件即可：

    $('#upload').Huploadify({
        auto:true,
        fileTypeExts:'*.jpg;*.png;*.exe',
        multi:true,
        formData:{key:123456,key2:'vvvv'},
        fileSizeLimit:1024,
        showUploadedPercent:true,
        showUploadedSize:true,
        removeTimeout:9999999,
        uploader:'upload.php',
        breakPoints:true,
        fileSplitSize:1024*1024,
        getUploadedSize:function(file){
            var size = parseInt(localStorage.getItem(file.name)) || 0;
            return size;
        },
        saveUploadedSize:function(file, value){
            localStorage.setItem(file.name, value);
        },
        onUploadStart:function(file){
            console.log(file.name+'开始上传');
        },
        onInit:function(obj){
            console.log('初始化');
            console.log(obj);
        },
        onUploadComplete:function(file){
            console.log(file.name+'上传完成');
        },
        onCancel:function(file){
            console.log(file.name+'删除成功');
        },
        onClearQueue:function(queueItemCount){
            console.log('有'+queueItemCount+'个文件被删除了');
        },
        onDestroy:function(){
            console.log('destroyed!');
        },
        onSelect:function(file){
            console.log(file.name+'加入上传队列');
        },
        onQueueComplete:function(queueData){
            console.log('队列中的文件全部上传完成',queueData);
        }
    });

具体的API使用方式，可参考uploadify官网，完全是参照它的API来的。

#####使用截图：
![使用截图](http://images.cnitblog.com/blog/520134/201312/01185252-55d3c4606ddb4a8995dc1b9563d2847b.jpg)

>更多详细说明，欢迎访问我的博客:[http://www.cnblogs.com/lvdabao/p/3452858.html](http://www.cnblogs.com/lvdabao/p/3452858.html)
