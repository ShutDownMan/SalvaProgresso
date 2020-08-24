console.log("Background TechnosExt...");

var currentUser = undefined;
var userLogList = [];

(function() {
	const networkFilters = {
		urls: [
			"*://*.cloudfront.net/*/aulainterativa/*"
		]
	};
	
	/// retrieve user logs from storage
	chrome.storage.sync.get(['UserLogs'], function(result) {
		/// if user logs is not empty
		if(result.UserLogs) {
			console.log("userLogList retrieved");
			userLogList = result.UserLogs;
			console.log(userLogList);
		} else {
			console.log("userLogList is empty");
		}
	});
	
	/// update list when changed elsewhere
	chrome.storage.onChanged.addListener(function(changes, namespace) {
		for (var key in changes) {
			let storageChange = changes[key];
			console.log('Storage key "%s" in namespace "%s" changed. ' +
			'Old value was "%s", new value is "%s".',
			key,
			namespace,
			storageChange.oldValue,
			storageChange.newValue);
			
			/// if user logs has been updated
			if(key === "UserLogs" && namespace === "sync") {
				/// update in memory variable
				userLogList = storageChange.newValue;
				console.log("Updated Sync Value");
			}
		}
	});
	
	/// add listener to requests
	chrome.webRequest.onBeforeRequest.addListener((details) => {
		const { tabId, requestId } = details;
		
		//console.log(details.url);
		/// check if request is for a flash file
		if(details.url.indexOf(".swf") !== -1) {
			//console.log(details.url);
			/// separate file name from url
			let flashFileName = details.url.substr(details.url.lastIndexOf('/') + 1);
			console.log(flashFileName);
			
			/// for all active tabs
			chrome.tabs.query({active: true}, function(tabs) {
				/// send message to content script of the tab with the corresponding flash file name
				chrome.tabs.sendMessage(tabId, {messageType: "blocoIdUpdate", flashFileName: flashFileName}, function(response) {
					/// if the update was a sucess save current user
					if(response.status === "success") {
						console.log("blocoIdUpdate");
						currentUser = response.currentUser;
						
						updateUserLogs(currentUser);
					}
				});
			});
			
		}
		
	}, networkFilters);
	
	/// manage messages from content.js
	chrome.runtime.onMessage.addListener(
		function(request, sender, sendResponse) {
			/// has to have messageType attribute
			if (request.hasOwnProperty("messageType")) {
				
				/// if it's a login message
				if(request.messageType === "user_login") {
					if(request.currentUser === undefined || Object.keys(request.currentUser).length === 0 && request.currentUser.constructor === Object) {
						sendResponse({});
						return false;
					}
					
					/// update current
					currentUser = request.currentUser;
					currentUser.b = "0";
					
					let foundLog = false;
					/// find it in log list
					for (var i = userLogList.length - 1; i >= 0; i--) {
						if(userLogList[i].t === currentUser.t
							&& userLogList[i].c === currentUser.c
							&& userLogList[i].d === currentUser.d
							&& userLogList[i].a === currentUser.a) {
								foundLog = true;
								
								/// if found blocoId is greater than current blocoId
								if(Number(userLogList[i].b) >= Number(currentUser.b)) {
									currentUser.b = String(userLogList[i].b);
								}
							}
						}
						
						if(foundLog === false) {
							logUser(currentUser);
						}
						
						//logUser(request.currentUser);
						
						sendResponse({});
						
						return true;
					}
					
					if(request.messageType === "request_user") {
						console.log("User has been requested!");
						sendResponse({currentUser: currentUser});
						return true;
					}
					
					if(request.messageType === "update_userlogs") {
						console.log("User has been updated!");
						updateUserLogs(request.currentUser);
						sendResponse({currentUser: currentUser});
						return true;
					}
				}
				//			return true;
			});
			
			
		}());
		
		function logUser(user) {
			console.log("User has been logged!");
			console.log(user);
			
			if(user === undefined || Object.keys(user).length === 0 && user.constructor === Object) return;
			
			//user["LogTimestamp"] = Date.now();
			userLogList.push(user);
			
			chrome.storage.sync.set({UserLogs: userLogList}, function() {
				console.log("userLogList saved");
			});
		}
		
		function updateUserLogs(user) {
			for (var i = userLogList.length - 1; i >= 0; i--) {
				if(userLogList[i].t === user.t
					&& userLogList[i].c === user.c
					&& userLogList[i].d === user.d
					&& userLogList[i].a === user.a) {
						
						userLogList.splice(i, 1);
					}
				}
				
				logUser(user);
			}
			
			function emptyUserlogList() {
				chrome.storage.sync.set({UserLogs: []}, function() {
					console.log("userLogList is now empty!");
				});
			}
			
			function jumpToBloco(blocoId) {
				if(currentUser !== undefined) {
					currentUser.b = String(blocoId);
					updateUserLogs(currentUser);
				} else {
					console.log("currentUser is undefined");
				}
			}
			
			function goToNextBloco() {
				if(currentUser !== undefined) {
					currentUser.b = String(Number(currentUser.b) + 1);
					updateUserLogs(currentUser);
				} else {
					console.log("currentUser is undefined");
				}
			}