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

	/// adiciona listener as requests
    chrome.webRequest.onBeforeRequest.addListener((details) => {
        const { tabId, requestId } = details;

		//console.log(details.url);
		/// checka se a request é de um arquivo flash
        if(details.url.indexOf(".swf") !== -1) {
			//console.log(details.url);
			/// separa o nome do arquivo flash
			let flashFileName = details.url.substr(details.url.lastIndexOf('/') + 1);
			console.log(flashFileName);

			/// para todas as abas ativas
			chrome.tabs.query({active: true}, function(tabs) {
				/// manda mensagem com o nome do arquivo flash
				chrome.tabs.sendMessage(tabId, {messageType: "blocoIdUpdate", flashFileName: flashFileName}, function(response) {
					/// se o updatefoi um sucesso atualiza a lista
					if(response.status === "success") {
						console.log("blocoIdUpdate");
						currentUser = response.currentUser;

						updateUserLogs(currentUser);
					}
			 	});
			});

        }

    }, networkFilters);

	chrome.runtime.onMessage.addListener(
		function(request, sender, sendResponse) {
			if (request.hasOwnProperty("messageType")) {

				if(request.messageType === "user_login") {
					if(request.currentUser === undefined || Object.keys(request.currentUser).length === 0 && request.currentUser.constructor === Object) {
						sendResponse({});
						return false;
					}

					currentUser = request.currentUser;
					currentUser.BlocoId = 0;

					for (var i = userLogList.length - 1; i >= 0; i--) {
						if(userLogList[i].IdUsuario === currentUser.IdUsuario
							&& userLogList[i].IdTrilha === currentUser.IdTrilha
							&& userLogList[i].IdCurso === currentUser.IdCurso
							&& userLogList[i].IdDisciplina === currentUser.IdDisciplina
							&& userLogList[i].IdAtividade === currentUser.IdAtividade) {

							if(userLogList[i].BlocoId >= currentUser.BlocoId) {
								currentUser.BlocoId = userLogList[i].BlocoId;
							}
						}
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

	user["LogTimestamp"] = Date.now();
	userLogList.push(user);

	chrome.storage.sync.set({UserLogs: userLogList}, function() {
		console.log("userLogList saved");
	});
}

function updateUserLogs(user) {
	for (var i = userLogList.length - 1; i >= 0; i--) {
		if(userLogList[i].IdUsuario === user.IdUsuario
			&& userLogList[i].IdTrilha === user.IdTrilha
			&& userLogList[i].IdCurso === user.IdCurso
			&& userLogList[i].IdDisciplina === user.IdDisciplina
			&& userLogList[i].IdAtividade === user.IdAtividade) {

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
		currentUser.BlocoId = String(blocoId);
		updateUserLogs(currentUser);
	} else {
		console.log("currentUser is undefined");
	}
}