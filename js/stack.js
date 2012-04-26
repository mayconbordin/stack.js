var Sandbox
  , Terminal
  , FileSystem
  , Editor
  , JsConsole;

$(document).ready(function() {
	Sandbox = (function() {
		var sandboxFrame = $('<iframe width="0" height="0"/>').css({visibility : 'hidden'}).appendTo('body')[0];
		var sandbox = sandboxFrame.contentWindow;

		// This should help IE run eval inside the iframe.
		if (!sandbox.eval && sandbox.execScript) {
			sandbox.execScript("null");
		}
	
		return {
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

	Terminal = (function() {
		var terminal
		  ,	handlers = {}
		  ,	commands = {};
		  
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
			}
		};
	})();


	FileSystem = (function() {
		var filer = new Filer()
		  , currentDir = '/';
		  
		filer.init();
	
		return {
			readTextFile: function(filepath, callback) {
				filer.open(filepath, function(file) {
				  	var reader = new FileReader();

				 	reader.onload = function(e) {
						callback(e.target.result);
				  	}
				  	reader.readAsText(file);
				}, Terminal.onError);
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
		        	Editor.focus();
		        	this.readTextFile(file, function(val) {
						Editor.setValue(val);
					});
				}
			}
		};
	})();

	Editor = (function() {
		var editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
			lineNumbers: true,
			mode: 'javascript',
			onFocus: function() {
				Terminal.disable();
			}
		});
	
		return {
			focus: function() {
				editor.focus();
			},
		
			setValue: function(val) {
				editor.setValue(val);
			}
		};
	})();

	JsConsole = (function() {
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
});

$(document).ready(function() {
	Terminal.register('FileSystem', [
		'ls', 'mkdir', 'cd', 'touch', 'echo', 'cat', 'edit'
	], FileSystem);
	
	Terminal.register('JsConsole', ['js'], JsConsole);
});
