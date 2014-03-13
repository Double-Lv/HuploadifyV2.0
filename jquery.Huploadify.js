(function($){
	$.fn.Huploadify = function(opts){
		var itemTemp = '<div id="${fileID}" class="uploadify-queue-item"><div class="uploadify-progress"><div class="uploadify-progress-bar"></div></div><span class="up_filename">${fileName}</span><a href="javascript:void(0);" class="uploadbtn">上传</a><a href="javascript:void(0);" class="delfilebtn">删除</a></div>';
		var defaults = {
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
			onCancel:null,//删除掉某个文件后的回调函数，可传入参数file
			onClearQueue:null,//清空上传队列后的回调函数，在调用cancel并传入参数*时触发
			onDestroy:null,//在调用destroy方法时触发
			onSelect:null,//选择文件后的回调函数，可传入参数file
			onQueueComplete:null//队列中的所有文件上传完成后触发
		}
			
		var option = $.extend(defaults,opts);

		//定义一个通用函数集合
		var F = {
			//将文件的单位由bytes转换为KB或MB，若第二个参数指定为true，则永远转换为KB
			formatFileSize : function(size,withKB){
				if (size > 1024 * 1024 && !withKB){
					size = (Math.round(size * 100 / (1024 * 1024)) / 100).toString() + 'MB';
				}
				else{
					size = (Math.round(size * 100 / 1024) / 100).toString() + 'KB';
				}
				return size;
			},
			//将输入的文件类型字符串转化为数组,原格式为*.jpg;*.png
			getFileTypes : function(str){
				var result = [];
				var arr1 = str.split(";");
				for(var i=0, len=arr1.length; i<len; i++){
					result.push(arr1[i].split(".").pop());
				}
				return result;
			},
			//根据文件序号获取文件
			getFile : function(index,files){
				for(var i=0;i<files.length;i++){	   
					if(files[i].index == index){
						return files[i];
					}
				}
				return null;
			},
			//根据后缀名获取文件Mime类型
			getMimetype : function(name){
				var mimetypeMap = {
					zip : ['application/x-zip-compressed'],
					jpg : ['image/jpeg'],
					png : ['image/png'],
					gif : ['image/gif'],
					doc : ['application/msword'],
					xls : ['application/msexcel'],
					docx : ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
					xlsx : ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
					ppt : ['application/vnd.ms-powerpoint'],
					pptx : ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
					mp3 : ['audio/mp3'],
					mp4 : ['video/mp4'],
					pdf : ['application/pdf']
				};
				return mimetypeMap[name];
			},
			//获取上传组件accept的值
			getAcceptString : function(str){
				var types = F.getFileTypes(str);
				var result = [];
				for(var i=0,len=types.length;i<len;i++){
					var mime = F.getMimetype(types[i]);
					if(mime){
						result.push(mime);				
					}
				}
				return result.join(',');
			}
		};

		var returnObj = null;

		this.each(function(index, element){
			var _this = $(element);
			var instanceNumber = $('.uploadify').length+1;
			var uploadManager = {
				container : _this,
				filteredFiles : [],//过滤后的文件数组
				uploadOver : false, //一次上传是否真正结束，用于断点续传的情况
				uploadStopped : true, //上传是否停止
				init : function(){
					var inputStr = '<input id="select_btn_'+instanceNumber+'" class="selectbtn" style="display:none;" type="file" name="fileselect[]"';
					inputStr += option.multi ? ' multiple' : '';
					inputStr += ' accept="';
					inputStr += F.getAcceptString(option.fileTypeExts);
					inputStr += '"/>';
					inputStr += '<a id="file_upload_'+instanceNumber+'-button" href="javascript:void(0)" class="uploadify-button">';
					inputStr += option.buttonText;
					inputStr += '</a>';
					var uploadFileListStr = '<div id="file_upload_'+instanceNumber+'-queue" class="uploadify-queue"></div>';
					_this.append(inputStr+uploadFileListStr);

					//初始化返回的实例
					returnObj =  {
						instanceNumber : instanceNumber,
						stop : function(){
				  			uploadManager.uploadOver = false;
							uploadManager.uploadStopped = true;
						},
						upload : function(fileIndex){
							if(fileIndex === '*'){
								for(var i=0,len=uploadManager.filteredFiles.length;i<len;i++){
									uploadManager._uploadFile(uploadManager.filteredFiles[i]);
								}
							}
							else{
								var file = F.getFile(fileIndex,uploadManager.filteredFiles);
								file && uploadManager._uploadFile(file);	
							}
						},
						cancel : function(fileIndex){
							uploadManager.uploadStopped = true;
							uploadManager.uploadOver = true;
							if(fileIndex === '*'){
								var len=uploadManager.filteredFiles.length;
								for(var i=len-1;i>=0;i--){
									uploadManager._deleteFile(uploadManager.filteredFiles[i]);
								}
								option.onClearQueue && option.onClearQueue(len);
							}
							else{
								var file = F.getFile(fileIndex,uploadManager.filteredFiles);
								file && uploadManager._deleteFile(file);
							}
						},
						disable : function(instanceID){
							var parent = instanceID ? $('file_upload_'+instanceID+'-button') : $('body');
							parent.find('.uploadify-button').css('background-color','#888').off('click');
						},
						ennable : function(instanceID){
							//点击上传按钮时触发file的click事件
							var parent = instanceID ? $('file_upload_'+instanceID+'-button') : $('body');
						  	parent.find('.uploadify-button').css('background-color','#707070').on('click',function(){
								parent.find('.selectbtn').trigger('click');
							});
						},
						destroy : function(){
							uploadManager.container.html('');
							uploadManager = null;
							option.onDestroy && option.onDestroy();
						},
						settings : function(name,value){
							if(arguments.length==1){
								return option[name];
							}
							else{
								if(name=='formData'){
									option.formData = $.extend(option.formData, value);
								}
								else{
									option[name] = value;
								}
							}
						},
						Huploadify : function(){
							var method = arguments[0];
							if(method in this){
								Array.prototype.splice.call(arguments, 0, 1);
								this[method].apply(this[method], arguments);
							}
						}
					};

					//文件选择控件选择
					var fileInput = this._getInputBtn();
				  	if (fileInput.length>0) {
						fileInput.change(function(e) { 
							uploadManager._getFiles(e); 
					 	});	
				 	}
				  
					//点击选择文件按钮时触发file的click事件
					_this.find('.uploadify-button').on('click',function(){
						_this.find('.selectbtn').trigger('click');
					});
				  
					option.onInit && option.onInit(returnObj);
				},
				_filter: function(files) {		//选择文件组的过滤方法
					var arr = [];
					var typeArray = F.getFileTypes(option.fileTypeExts);
					if(typeArray.length>0){
						for(var i=0,len=files.length;i<len;i++){
							var f = files[i];
							if(parseInt(F.formatFileSize(f.size,true))<=option.fileSizeLimit){
								if($.inArray('*',typeArray)>=0 || $.inArray(f.name.split('.').pop(),typeArray)>=0){
									arr.push(f);
								}
								else{
									alert('文件 "'+f.name+'" 类型不允许！');
								}
							}
							else{
								alert('文件 "'+f.name+'" 大小超出限制！');
								continue;
							}
						}
					}
					return arr;
				},
				_getInputBtn : function(){
					return _this.find('.selectbtn');
				},
				_getFileList : function(){
					return _this.find('.uploadify-queue');
				},
				//根据选择的文件，渲染DOM节点
				_renderFile : function(file){
					var $html = $(option.itemTemplate.replace(/\${fileID}/g,'fileupload_'+instanceNumber+'_'+file.index).replace(/\${fileName}/g,file.name).replace(/\${fileSize}/g,F.formatFileSize(file.size)).replace(/\${instanceID}/g,_this.attr('id')));
					//如果是非自动上传，显示上传按钮
					if(!option.auto){
						$html.find('.uploadbtn').css('display','inline-block');
					}

					//如果开启断点续传，先初始化原来上传的文件大小
					var initWidth = 0,initFileSize = '0KB',initUppercent = '0%';
					if(option.breakPoints){
						var uploadedSize = option.getUploadedSize(file);	
						//先设置进度条为原来已上传的文件大小
						//矫正计算误差出现的大于100%问题
						if(uploadedSize >= file.size){
							initWidth = initUppercent = '100%';
							initFileSize = F.formatFileSize(file.size);
						}
						else{
							initWidth = (uploadedSize / file.size * 100) + '%';
							initFileSize = F.formatFileSize(uploadedSize);
							initUppercent = (uploadedSize / file.size * 100).toFixed(2) + '%';
						}

						$html.find('.uploadify-progress-bar').css('width',initWidth);
					}

					uploadManager._getFileList().append($html);

					//判断是否显示已上传文件大小
					if(option.showUploadedSize){
						var num = '<span class="progressnum"><span class="uploadedsize">'+initFileSize+'</span>/<span class="totalsize">${fileSize}</span></span>'.replace(/\${fileSize}/g,F.formatFileSize(file.size));
						$html.find('.uploadify-progress').after(num);
					}
					
					//判断是否显示上传百分比	
					if(option.showUploadedPercent){
						var percentText = '<span class="up_percent">'+initUppercent+'</span>';
						$html.find('.uploadify-progress').after(percentText);
					}

					//触发select动作
					option.onSelect && option.onSelect(file);

					//判断是否是自动上传
					if(option.auto){
						uploadManager._uploadFile(file);
					}
					else{
						//如果配置非自动上传，绑定上传事件
					 	$html.find('.uploadbtn').on('click',function(){
					 		if(!$(this).hasClass('disabledbtn')){
					 			$(this).addClass('disabledbtn');
					 			uploadManager._uploadFile(file);
					 		}
				 		});
					}

					//为删除文件按钮绑定删除文件事件
			 		$html.find('.delfilebtn').on('click',function(){
			 			if(!$(this).hasClass('disabledbtn')){
					 		$(this).addClass('disabledbtn');
			 				uploadManager._deleteFile(file);
			 			}
			 		});
				},
				//获取选择后的文件
				_getFiles : function(e){
			  		var files = e.target.files;
			  		files = uploadManager._filter(files);
			  		var fileCount = _this.find('.uploadify-queue .uploadify-queue-item').length;//队列中已经有的文件个数
		  			for(var i=0,len=files.length;i<len;i++){
		  				files[i].index = ++fileCount;
		  				files[i].status = 0;//标记为未开始上传
		  				uploadManager.filteredFiles.push(files[i]);
		  				var l = uploadManager.filteredFiles.length;
		  				uploadManager._renderFile(uploadManager.filteredFiles[l-1]);
		  			}
				},
				//删除文件
				_deleteFile : function(file){
					for (var i = 0,len=uploadManager.filteredFiles.length; i<len; i++) {
						var f = uploadManager.filteredFiles[i];
						if (f.index == file.index) {
							/*if(option.breakPoints){
						  		uploadManager.uploadStopped = true;
						  	}*/
							uploadManager.filteredFiles.splice(i,1);
							_this.find('#fileupload_'+instanceNumber+'_'+file.index).fadeOut();
							option.onCancel && option.onCancel(file);	
							break;
						}
			  		}
				},
				//校正上传完成后的进度条误差
				_regulateView : function(file){
					var thisfile = _this.find('#fileupload_'+instanceNumber+'_'+file.index);
					thisfile.find('.uploadify-progress-bar').css('width','100%');
					option.showUploadedSize && thisfile.find('.uploadedsize').text(thisfile.find('.totalsize').text());
					option.showUploadedPercent && thisfile.find('.up_percent').text('100%');	
				},
				onProgress : function(fileblob, originalfile, loaded, total) {
					var eleProgress = _this.find('#fileupload_'+instanceNumber+'_'+originalfile.index+' .uploadify-progress');
					var thisLoaded = loaded;
					//根据上一次触发progress时上传的大小，得到本次的增量
					var lastLoaded = eleProgress.attr('lastLoaded') || 0;
					loaded -= parseInt(lastLoaded);

					var progressBar = eleProgress.children('.uploadify-progress-bar');
					var oldWidth = option.breakPoints ? parseFloat(progressBar.get(0).style.width || 0) : 0;
					var oldProgressNum = eleProgress.nextAll('.progressnum').find('.uploadedsize');
					var oldSize = parseFloat(oldProgressNum.text()) || 0;
					var percent = (loaded / originalfile.size * 100 + oldWidth).toFixed(2);
					var percentText = percent > 100 ? '99.99%' : percent + '%';//校正四舍五入的计算误差

					if(option.showUploadedSize){
						oldProgressNum.text(F.formatFileSize(thisLoaded + oldSize*1024*1024));
					}
					if(option.showUploadedPercent){
						eleProgress.nextAll('.up_percent').text(percentText);	
					}
					progressBar.css('width', percentText);

					//记录本次触发progress时已上传的大小，用来计算下次需增加的数量
					if(thisLoaded<option.fileSplitSize){
						eleProgress.attr('lastLoaded',thisLoaded);
					}
					else{
						eleProgress.removeAttr('lastLoaded');	
					}
			  	},
			  	_allFilesUploaded : function(){
		  			var queueData = {
						uploadsSuccessful : 0,
						uploadsErrored : 0
					};
			  		for(var i=0,len=uploadManager.filteredFiles.length; i<len; i++){
			  			var s = uploadManager.filteredFiles[i].status;
			  			if(s===0 || s===1){
			  				queueData = false;
			  				break;
			  			}
			  			else if(s===2){
			  				queueData.uploadsSuccessful++;
			  			}
			  			else if(s===3){
			  				queueData.uploadsErrored++;
			  			}
			  		}
			  		return queueData;
			  	},
			  	//上传文件片
			  	_sendBlob : function(xhr, file, originalfile){
			  		if(file.status===0){
						file.status = 1;//标记为正在上传
						uploadManager.uploadStopped = false;
						xhr.open(option.method, option.uploader, true);
						xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
						var fd = new FormData();
						fd.append(option.fileObjName,file);
						fd.append(option.fileObjName, originalfile.name);
						fd.append('lastModifiedDate', originalfile.lastModifiedDate.getTime());
						if(option.formData){
						 	for(key in option.formData){
						  		fd.append(key,option.formData[key]);
						  	}
						}
						xhr.send(fd);
					}
			  	},
			  	//上传成功后的回调函数
			  	_uploadSucessCallback : function(file, xhr){
			  		uploadManager._regulateView(file);
					file.status = 2;//标记为上传成功
					option.onUploadSuccess && option.onUploadSuccess(file, xhr.responseText);
					//在指定的间隔时间后删掉进度条
					setTimeout(function(){
						_this.find('#fileupload_'+instanceNumber+'_'+file.index).fadeOut();
					},option.removeTimeout);
			  	},
				//上传文件
				_uploadFile : function(file){
					var xhr = null;
					var originalFile = file;//保存原始未切割的文件引用
					try{
						xhr=new XMLHttpRequest();
					}catch(e){	  
						xhr=ActiveXobject("Msxml12.XMLHTTP");
				  	}

				  	//判断是否开启断点续传
				  	if(option.breakPoints){
				  		var uploadedSize = 0;
				  		if(option.getUploadedSize){
				  			uploadedSize = option.getUploadedSize(originalFile);
				  		}
				  		else{
				  			alert('请先配置getUploadedSize参数！');
				  			return;
				  		}
				  		file = originalFile.slice(uploadedSize,uploadedSize + option.fileSplitSize);
				  		file.status = originalFile.status;
				  		file.name = originalFile.name;
				  	}

				  	if(xhr.upload){
				  		// 上传中
					  	xhr.upload.onprogress = function(e) {
							uploadManager.onProgress(file, originalFile, e.loaded, e.total);
						};

						xhr.onreadystatechange = function(e) {
							if(xhr.readyState == 4){
								uploadManager.uploadOver = true;
								if(xhr.status == 200){
									if(option.breakPoints){
										//保存已上传文件大小
										uploadedSize += option.fileSplitSize;
										if(option.saveUploadedSize){
											option.saveUploadedSize(originalFile,uploadedSize);	
										}
										else{
											alert('请先配置saveUploadedSize参数！');
											return;
										}
										//继续上传其他片段
										if(uploadedSize<originalFile.size){
											uploadManager.uploadOver = false;
											if(!uploadManager.uploadStopped){
												file = originalFile.slice(uploadedSize,uploadedSize + option.fileSplitSize);
										  		file.status = originalFile.status;
										  		file.name = originalFile.name;
												uploadManager._sendBlob(xhr, file, originalFile);
											}
										}
										else{
											uploadManager._uploadSucessCallback(originalFile, xhr);
										}
									}
									else{
										uploadManager._uploadSucessCallback(originalFile, xhr);
									}
								}
								else {
									originalFile.status = 3;//标记为上传失败
									option.onUploadError && option.onUploadError(originalFile, xhr.responseText);
								}

								//无论上传成功或失败均执行下面的代码
								if(uploadManager.uploadOver){
									option.onUploadComplete && option.onUploadComplete(originalFile,xhr.responseText);
									//检测队列中的文件是否全部上传完成，执行onQueueComplete
									if(option.onQueueComplete){
										var queueData = uploadManager._allFilesUploaded();
										queueData && option.onQueueComplete(queueData);	
									}

									//清除文件选择框中的已有值
									uploadManager._getInputBtn().val('');
								}
								
							}
						}

						//开始上传文件
						option.onUploadStart && option.onUploadStart(originalFile);
						uploadManager._sendBlob(xhr, file, originalFile);
						
				  	}
				}
			};

			uploadManager.init();
		});
		
		return returnObj;

	}
})(jQuery)