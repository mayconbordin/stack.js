var Sandbox = (function() {
	var sandboxFrame
	  , sandbox;
	  
	return {
		init: function() {
			sandboxFrame = $('<iframe width="0" height="0"/>').css({visibility : 'hidden'}).appendTo('body')[0];
			sandbox = sandboxFrame.contentWindow;

			// This should help IE run eval inside the iframe.
			if (!sandbox.eval && sandbox.execScript) {
				sandbox.execScript("null");
			}
		},
		
		run: function(command) {
			return sandbox.eval ? sandbox.eval(command) : eval(command);
		},
	
		load: function(src) {
			var script = document.createElement('script');
			script.type = "text/javascript";
			script.src = src;

			if (sandboxFrame) {
				return sandboxFrame.contentDocument.body.appendChild(script);
			} else {
				return document.body.appendChild(script);
			}
		},
	};
})();

var Terminal = (function() {
	var terminal
	  ,	handlers = {}
	  ,	commands = {};
	  
	function trim(s) {
		s = s.replace(/(^\s*)|(\s*$)/gi,"");
		s = s.replace(/[ ]{2,}/gi," ");
		s = s.replace(/\n /,"\n");
		return s;
	}

	function tokenize(str) {
		return trim(str).split(' ');
	}

	function onError(e) {
  		terminal.echo('Error' + e.name);
	}

	return {
		init: function() {
			terminal = $('#terminal').terminal(function(command, term) {
				command = tokenize(command);
	
				if (command[0] in commands) {
					args = command.slice(1);
					handler = handlers[commands[command[0]]];
					handler[command[0]].apply(handler, args);
				} else {
					term.echo("unknow command " + command[0]);
				}
			}, {
				greetings: "multiply terminals demo use help to see available commands"
			});
			
			this.register('Terminal', ['help'], this);
		},
		
		help: function() {
			var i = 0;
			var s = '';
			for (command in commands) {
				s += command + "\t\t";
				
				if (i%4 == 0) {
					terminal.echo(s);
					s = '';
				}
				i++;
			}
			terminal.echo(s);
		},
		
		register: function(name, list, obj) {
			for (var i=0; i<list.length; i++) {
				commands[list[i]] = name;
				handlers[name] = obj;
			}
		},
	
		onError: function(e) {
	  		terminal.echo('Error' + e.name);
		},
	
		setPrompt: function(path) {
			$('.prompt').html(path + '>');
		},
	
		echo: function(str) {
			terminal.echo(str);
		},
	
		disable: function() {
			terminal.disable();
		},
		
		push: function(f, o) {
			terminal.push(f, o);
		},
		
		focus: function(b) {
			terminal.focus(b);
		}
	};
})();


var FileSystem = (function() {
	var filer = new Filer()
	  , currentDir = '/';
	  
	return {
		init: function() {
			filer.init();
		},
		
		readTextFile: function(filepath, callback) {
			filer.open(filepath, function(file) {
			  	var reader = new FileReader();

			 	reader.onload = function(e) {
					callback(e.target.result);
			  	}
			  	reader.readAsText(file);
			}, Terminal.onError);
		},
		
		writeTextFile: function(filepath, data, callback) {
			filer.write(filepath, {data: data, type: 'text/plain'},
						callback || function(){}, Terminal.onError);
		},
	
		ls: function(folder) {
			folder = folder || currentDir;
			filer.ls(folder, function(entries) {
				for (var i=0; i<entries.length; i++) {
					if (entries[i].isFile)
						Terminal.echo("[[;#00de00;]" + entries[i].name + "]");
					else
						Terminal.echo("[[b;#00bcde;]" + entries[i].name + "]");
				}
			}, Terminal.onError);
		},
	
		mkdir: function(folder) {
			if (!folder)
	        	Terminal.echo('mkdir: missing operand');
	        else
	        	filer.mkdir(folder, false, function(dirEntry) {}, Terminal.onError);
		},
	
		cd: function(path) {
			path = path || '';
	        	
	        filer.cd(path, function(dirEntry) {
	        	Terminal.setPrompt(dirEntry.fullPath);
	        	currentDir = dirEntry.fullPath;
			}, Terminal.onError);
		},
	
		touch: function(file) {
			if (!file)
	    		Terminal.echo('touch: missing file operand');
	    	else	
				filer.create(file, true, function(fileEntry) {}, Terminal.onError);
		},
		
		rm: function(filepath) {
			if (!filepath)
	    		Terminal.echo('rm: missing operand');
	    	else
	    		filer.rm(filepath, function() {}, Terminal.onError);
		},
		
		cp: function(from, to, name) {
			if (!from)
				Terminal.echo("cp: missing file operand");
			else if (!to)
				Terminal.echo("cp: missing destination file operand after '" + from + "'");
			else
				filer.cp(from, to, name || null, function(entry) {}, Terminal.onError);
		},
		
		mv: function(from, to, name) {
			if (!from)
				Terminal.echo("mv: missing file operand");
			else if (!to)
				Terminal.echo("mv: missing destination file operand after '" + from + "'");
			else
				filer.mv(from, to, name || null, function(entry) {}, Terminal.onError);
		},
	
		echo: function(out) {
			Terminal.echo(out);
		},
	
		cat: function(file) {
			 if (file) {
	        	this.readTextFile(file, function(val) {
					Terminal.echo(val);
				});
			}
		},
	
		edit: function(file) {
			if (!file)
	    		Terminal.echo('edit: missing file operand');
	        else {
	        	Editor.open(file);
			}
		}
	};
})();

var Editor = (function() {
	var editor
	  , currentFile;

	return {
		init: function() {
			editor = CodeMirror.fromTextArea(document.getElementById('editor-textarea'), {
				lineNumbers: true,
				mode: 'javascript',
				onFocus: function() {
					Terminal.disable();
				}
			});
			
			$('#editor-save').click(function() {
				Editor.save();
			});
			
			$('#editor-cancel').click(function() {
				Editor.cancel();
			});
		},
		
		save: function(file) {
			file = file || currentFile;
			if (file)
				FileSystem.writeTextFile(file, editor.getValue());
		},
		
		open: function(filepath) {
			editor.focus();
        	FileSystem.readTextFile(filepath, function(val) {
				editor.setValue(val);
				currentFile = filepath;
			});
		},
		
		cancel: function() {
			editor.setValue('');
			currentFile = null;
			Terminal.focus(true);
		}
	};
})();

var JsConsole = (function() {
	function formatResult(result) {
		var output = '';
		if ( _.isUndefined(result) )
			output += '[[;#777;]' + String(result) + ']';
		else if ( _.isNumber(result) )
			output += '[[;#7f7;]' + String(result) + ']';
		else if ( _.isString(result) )
			output += '"[[;#99f;]' + String(result) + ']"';
		else
			output += String(result)

		return output;
	}
	
	return {
		js: function(file) {
			if (file) {
				FileSystem.readTextFile(file, function(val) {
					var result = Sandbox.run(val);
				    if (result != undefined) {
				       Terminal.echo(formatResult(result));
				    }
				});
	    	} else {
			    Terminal.push(function(command, term) {
			        var result = Sandbox.run(command);
			        if (result != undefined) {
			           Terminal.echo(formatResult(result));
			        }
			    }, {
			        name: 'js',
			        prompt: 'js>'
			    });
			}
		}
	};
})();

var CoffeeScriptConsole = (function() {
	
	function fromJs(input) {
		return Js2coffee.build(input);
	}
	
	function toJs(input) {
		return CoffeeScript.compile(input, {
          bare: "on"
        });
	}
	
	return {
		coffee: function(file) {
			if (file && file.indexOf('.coffee') != -1) {
				FileSystem.readTextFile(file, function(val) {
					FileSystem.writeTextFile(file.replace('.coffee', '.js'), toJs(val));
				});
	    	}
		},
		
		js2coffee: function(file) {
			if (file && file.indexOf('.js') != -1) {
				FileSystem.readTextFile(file, function(val) {
					FileSystem.writeTextFile(file.replace('.js', '.coffee'), fromJs(val));
				});
	    	}
		}
	};
})();

var Stack = {
	init: function() {
		Sandbox.init();
		Terminal.init();
		FileSystem.init();
		Editor.init();
	}
};

$(document).ready(function() {
	Stack.init();
	Terminal.register('FileSystem', [
		'ls', 'mkdir', 'cd', 'touch', 'echo', 'cat', 'edit', 'rm', 'cp', 'mv'
	], FileSystem);
	
	Terminal.register('JsConsole', ['js'], JsConsole);
	Terminal.register('CoffeeScriptConsole', ['coffee', 'js2coffee'], CoffeeScriptConsole);
});
