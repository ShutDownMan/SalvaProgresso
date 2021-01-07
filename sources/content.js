console.log("Liberar Blocos Extension!");

(function () {
	/// Adiciona shortcut para pular bloco
	let shortcutListener = `
	document.onkeypress = function (e) {
		e = e || window.event;
		if(e.key === '|') {
			try {
				nextBloco();
			} catch (error) {
				console.log(error);
			}
		}
	}
`
	var scriptTag = document.createElement('script');
	var code = document.createTextNode(shortcutListener);
	scriptTag.appendChild(code);
	(document.body || document.head).appendChild(scriptTag);

}());