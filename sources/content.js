console.log("Liberar Blocos Extension!")

var pageScript = "";
var currentTags = childrenToArray(document);
var dadosAulaXML = undefined;
var currentAulaXML = undefined;
var blocosDict = {};
var currentBlocoId = -1;
var finalBlocoId = -1;
var currentUser = undefined;

// getting source code string

function main() {
	addBlocoIdListener();

	if(location.href.indexOf("cloudfront.net") !== -1 && location.href.indexOf("aulainterativa") !== -1) {
		runAulaScript();
		return;
	}

	if(location.href.indexOf("evoluaeducacao.com.br/Cursos/") !== -1) {
		runUserLoginScript();
		return;
	}

}
main();

function runAulaScript() {

	/// chama info do usuario atual (async)
	getUserInfo();

	/// pega a função o código da página atual
	getScriptFromPage();

	// wait for currentUser to be defined
	waitUserData();
}

function waitUserData() {
	/// checka a cada 250 ms se currentUser esta definido
	var waitUserDataId = setInterval(() => {
		/// se está definido
		if(currentUser !== undefined) {
			/// chama a funcao de manipulacao de script
			updateDadosAula();
			/// limpa a chamada continua
			clearInterval(waitUserDataId);
			//console.log("We did it bois")
			console.log("currentUser is defined!")
		}
	}, 250);
}

function updateDadosAula() {

	// separating function and eval on it

	/// seoara a funcao e executa ela
	dadosAulaFuncStr = pageScript.innerText.substr(pageScript.innerText.indexOf("function dadosAulaJS"));
	dadosAulaFuncStr = dadosAulaFuncStr.substr(0, dadosAulaFuncStr.indexOf("}") + 1);

	eval(dadosAulaFuncStr);

	// Getting XML on it

	/// oega o xml que a funcao retorna
	dadosAulaXML = $.parseXML(dadosAulaJS());

	/// url da legenda
	var legs = $(dadosAulaXML).find("localLegenda")

	// getting legendas from resource
	getLegs(location.href.substring(0, location.href.lastIndexOf('/')) + '/' + legs.text())

	/// se o bloco atual eh o ultimo bloco
	if(finalBlocoId === currentBlocoId) {
		/// coloca bloco atual como inicio
		currentBlocoId = 0;
		currentUser.b = String(currentBlocoId);
		/// atualiza nos logs
		chrome.runtime.sendMessage({messageType: "update_userlogs", currentUser: currentUser},
			(r) => {console.log("update_userlogs");}
			);
	}

	/// passa pelos blocos liberando
	$(dadosAulaXML).find("bloco").each(function(index) {
		//console.log($(this).find("id").text());

		/// se o bloco atual tiver id menor que o bloco do usuario
		if(Number($(this).find("id").text()) < currentBlocoId) {
			/// libera bloco
			$(this).find("nota").text("10");
			$(this).find("status").text("1");
		}
	})

	//console.log(dadosAulaXML);

	var newDadosAulaXML = (new XMLSerializer()).serializeToString(dadosAulaXML);

	//console.log(newDadosAulaXML);

	let newDadosAulaFunc = "function dadosAulaJS() { console.log(\"dadosAulaJS has been injected successfully\"); return \"<new_xml>\"; }";

	newDadosAulaFunc = newDadosAulaFunc.replace("<new_xml>", newDadosAulaXML);

	//console.log(newDadosAulaFunc);

	var scriptTag = document.createElement('script');
	var code = document.createTextNode(newDadosAulaFunc);
	scriptTag.appendChild(code);
	(document.body || document.head).appendChild(scriptTag);
}

function updateFechaModal() {
	let modalBodies = document.getElementsByClassName("modal-fecha-body");

	for (var i = modalBodies.length - 1; i >= 0; i--) {
		modalBodies[i].innerText = "Deseja mesmo sair?\nSeu progresso será salvo, mantenha a extensão ativa.";
	}
}

function childrenToArray(tagElem) {
	let tagArr = [];

	Array.from(tagElem.children).forEach(function (element) {
		tagArr.push(element);
	  });

	return tagArr;
}

function getScriptFromPage() {
	while (currentTags.length > 0) {
		// console.log(currentTags)

		currentTags = currentTags.concat(childrenToArray(currentTags[0]));

		let firstTag = currentTags.shift(); // removes and stores first element

		if(firstTag.tagName.toLowerCase() === "script" && firstTag.getAttribute("type") === "text/javascript"
			&& firstTag.innerText.indexOf("dadosAulaJS") !== -1) {
			pageScript = firstTag;
		}
	}
}

function getLegs(localLegenda) {

	//console.log(localLegenda)

	$.ajax({
		type: "GET",
		dataType: "text",
		url: localLegenda,
		success: function(resposta) {
			populateCurrentAulaXML(resposta);
			populateBlocosDict();
		},
		fail: function(resposta) {
			console.log(resposta);
		}
	});
}

function populateCurrentAulaXML(xml) {
	if(currentAulaXML !== undefined) {
		console.log("ERROR: currentAulaXML is already populated!")
		return;
	}

	/// remove comentarios que causam conflitos
	xml = xml.replace("<!--");
	xml.split('\n').filter(function (s) { return (s.match('<!-')) ? "" : s });

	/// paseia a string para xml
	currentAulaXML = $.parseXML(xml);
}

function populateBlocosDict() {
	if(currentAulaXML === undefined) {
		console.log("ERROR: currentAulaXML is NOT populated!");
		return;
	}

	/// passa pelo arquivo xml e cria um dicionario com os nomesde aquivos/ids
	$(currentAulaXML).find("bloco").each(function(index) {
		blocosDict[$(this).attr("filme")] = $(this).attr("id");

		isFinalBloco($(this), $(this).attr("id"));
	});
}

function isFinalBloco(xmlTag, id) {
	/// para cada conteudo no bloco testa se eh final
	$(xmlTag).find("conteudo").each(function(index) {
		if($(this).text() === ".") {
			finalBlocoId = id;
			//console.log("finalBlocoId = " + finalBlocoId);
		}
	});
}

function addBlocoIdListener() {
	chrome.runtime.onMessage.addListener(
		function(request, sender, sendResponse) {
			/// se nao esta formatada corretamente
			if(!request.hasOwnProperty("messageType") || request.messageType !== "blocoIdUpdate") {
				sendResponse({});
				return;
			}

			/// se tem nome do arquivo flash
			if(request.hasOwnProperty("flashFileName")) {
				/// pega id do bloco a partir do nome
				let fileId = blocosDict[request.flashFileName];

				/// se id do bloco for maior que id atual
				if(fileId > currentBlocoId) {
					/// seta o id atual para id do arquivo
					currentBlocoId = fileId;

					/// atualiza nos logs
					if(currentUser !== undefined) {
						currentUser.b = String(currentBlocoId);

						sendResponse({status: "success", currentUser: currentUser});
					}
				}

				sendResponse({status: "received", currentUser: currentUser});
			}

			sendResponse({status: "error"});
			return true;
		});
}

function runUserLoginScript() {
	/// coloca uma funcao no botao de executar atividade
    $(document).on("click", ".atividade-link, .btn-atividade-link", function () {
    	/// pega as inforamoes da aula
        var link = $(this).attr("data-link");

        if(link.length === 0) {
        	console.log("ERROR: link string is empty!");
        }

        /// cria objeto com as informacoes do usuario atual
	    currentUser = {
			t: localStorage.getItem("id-trilha-atual"),
			c: localStorage.getItem("id-curso-atual"),
			d: localStorage.getItem("id-disciplina-atual"),
			u: link.match(/(?:IdUnidade=)(\d+)/)[1],
			a: link.match(/(?:IdAtividade=)(\d+)/)[1],
			b: "-1"
	    }

	    /// avisa background script do usuario
		chrome.runtime.sendMessage({messageType: "user_login", currentUser: currentUser},
			(r) => {console.log("user_login");});
    });

	updateFechaModal();
//    $(document).on("click", ".player_close_img", function () { })

}

function getUserInfo() {
	chrome.runtime.sendMessage({messageType: "request_user", currentUser: currentUser},
		function(response) {
			//console.log("BEFORE USERINFO QUERY");
			if(response !== undefined && response.currentUser !== undefined) {
				currentUser = response.currentUser;
				currentBlocoId = Number(currentUser.b);
				//console.log("INSIDE USERINFO QUERY");
				//console.log(currentUser);
			} else {
				console.log("ERROR: currentUser is undefined!");
			}

//			return true;
		});
		//console.log("AFTER USERINFO QUERY");

		//console.log(currentUser);
}