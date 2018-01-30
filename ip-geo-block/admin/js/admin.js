/*jslint white: true, plusplus: true, bitwise: true */
/*eslint no-mixed-spaces-and-tabs: ["error", "smart-tabs"]*/
/*!
 * Project: WordPress IP Geo Block
 * Copyright (c) 2013-2018 tokkonopapa (tokkonopapa@yahoo.com)
 * This software is released under the MIT License.
 */
(function ($, window, document) {
	'use strict';

	// External variables
	var timer_stack = [],
	    window_width = $(window).width(),
	    ip_geo_block      = IP_GEO_BLOCK,
	    ip_geo_block_auth = IP_GEO_BLOCK_AUTH;

	function ID(selector, id) {
		var keys = {
			'.': '.ip-geo-block-',
			'#': '#ip-geo-block-',
			'@': '#ip_geo_block_settings_',
			'$': 'ip-geo-block-',
			'%': 'ip_geo_block_',
			'!': 'ip_geo_block_settings_'
		};
		return 'undefined' !== typeof id ? keys[selector] + id : keys.$ + selector;
	}

	function escapeHTML(str) {
		return str.toString().replace(/[&<>"']/g, function (match) {
			return {
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;'
			}[match];
		}).replace(/&amp;(#\d{2,4}|\w{4,7});/g, "&$1;"); // revert html character entity
	}

	function stripTag(str) {
		return escapeHTML(str.toString().replace(/(<([^>]+)>)/ig, ''));
	}

	function onresize(name, callback) {
		var w = $(window).width();
		if (w !== window_width) {
			window_width = w;
			if ('undefined' === typeof timer_stack[name]) {
				timer_stack[name] = {id: false, callback: callback};
			}
			$(window).off('resize').on('resize', function (/*event*/) {
				if (false !== timer_stack[name].id) {
					window.clearTimeout(timer_stack[name].id);
				}
				timer_stack[name].time = window.setTimeout(timer_stack[name].callback, 200);
				return false;
			});
		}
	}

	function loading(id, flag) {
		if (flag) {
			$(ID('#', id)).addClass(ID('loading'));
		} else {
			$(ID('#', id)).removeClass(ID('loading'));
		}
	}

	function confirm(msg, callback) {
		if (window.confirm(stripTag(msg))) {
			callback();
		}
	}

	function warning(status, msg, cmd) {
		window.alert(stripTag(msg || ip_geo_block.msg[12].replace('%s', cmd) + ' (' + status + ')'));
	}

	function notice_html5() {
		warning(null, stripTag(ip_geo_block.msg[10]));
	}

	function redirect(page, tab) {
		if (-1 !== window.location.href.indexOf(page)) {
			window.location = stripTag(page) + (tab ? '&' + stripTag(tab) : '') + '&ip-geo-block-auth-nonce=' + ip_geo_block_auth.nonce;
		}
	}

	function ajax_post(id, request, callback, objs) {
		if (id) {
			loading(id, true);
		}

		request.action = ip_geo_block.action;
		request.nonce  = ip_geo_block.nonce;

		$.post(ip_geo_block.url, request)

		.done(function (data/*, textStatus, jqXHR*/) {
			if (callback) {
				callback(data);
			}
		})

		.fail(function (jqXHR /*,textStatus, errorThrown*/) {
			warning(jqXHR.status, jqXHR.responseText, request.action);
		})

		.always(function () {
			if (id) {
				if ('object' === typeof objs) { // deferred object
					$.when.apply($, objs).then(function () {
						loading(id, false);
					});
				} else {
					loading(id, false);
				}
			}
		});
	}

	// Clear statistics, cache, logs
	function ajax_clear(cmd, type) {
		ajax_post(cmd, {
			cmd: 'clear-' + cmd,
			which: type
		}, function (data) {
			redirect(data.page, data.tab);
		});
	}

	// Manipulate DB table for validation logs
	function ajax_table(cmd) {
		ajax_post(cmd, {
			cmd: cmd
		}, function (data) {
			redirect(data.page, data.tab);
		});
	}

	// Prevent event propergation
	function stopPropergation(event) {
		event.stopImmediatePropagation();
		return false;
	}

	// Show/Hide description of WP-ZEP
	function show_description(select) {
		var data, desc = ID('.', 'desc');
		select.next(desc).empty();
		data = select.children('option:selected').data('desc');
		if (data) {
			select.next(desc).html($.parseHTML(data)); // jQuery 1.8+
		}
	}

	// Fold the contents
	function fold_elements(obj, stat) { // obj: ul object
		if (stat) {
			obj.removeClass('folding-disable');
		} else {
			obj.children(ID('.', 'hide')).hide();
			obj.addClass('folding-disable');
			obj.removeClass(ID('dropdown')).addClass(ID('dropup'));
		}
	}

	// Show/Hide descendant elements
	function show_descendants($this, $elem, mask) {
		var stat = (0 === $this.prop('type').indexOf('checkbox') && $this.is(':checked')) ||
		           (0 === $this.prop('type').indexOf('select'  ) && '0' !== $this.val());

		// checkbox
		$this.siblings('input[name^="' + ID('%', 'settings') + '"]:checkbox').prop('disabled', !stat);

		// folding list
		$elem.nextAll(ID('.', 'settings-folding')).each(function (i, obj) {
			fold_elements($(obj), stat && mask);
		});
	}

	// Show / Hide Exceptions
	function show_folding_ajax(elem) {
		var id = ID('@', 'validation_ajax_');
		fold_elements(
			elem.closest('ul').next(),
			$(id + '1').is(':checked') || $(id + '2').is(':checked')
		);
	}

	// Encode/Decode to prevent blocking before post ajax
	function base64_encode(str) {
		return window.btoa(str);
	}

	function base64_decode(str) {
		return window.atob(str);
	}

	// Equivalent for PHP's str_rot13
	// @link http://phpjs.org/functions/str_rot13/
	function str_rot13(str) {
		return String(str).replace(/[a-z]/gi, function (s) {
			return String.fromCharCode(s.charCodeAt(0) + (s.toLowerCase() < 'n' ? 13 : -13)); //'
		});
	}

	// Wrapper for encode/decode strings
	function encode_str(str) {
		return base64_encode(str_rot13(str));
	}

	function decode_str(str) {
		return str_rot13(base64_decode(str));
	}

	// File Reader
	function readfile(file, callback) {
		var reader = new window.FileReader();
		reader.onload = function (event) {
			if (callback) {
				callback(event.target.result);
			}
		};
		reader.onerror = function (event) {
			warning('Error', event.target.error.code);
		};
		reader.readAsText(file);
	}

	// Enable / Disable at front-end target settings
	function set_front_end($this) {
		var checked = $this.is(':checked'),
		    select  = $(ID('@', 'public_target_rule')),
		    parent  = $this.closest('tr').nextAll('tr');

		// Enable / Disable descendent items
		parent.find('[name^="' + ID('%', 'settings') + '"]').prop('disabled', !checked);

		// Enable / Disable description
		parent.find(ID('.', 'desc')).css('opacity', checked ? 1.0 : 0.5);

		// Show / Hide validation target
		show_descendants($this, select, '1' === select.val() ? true : false);
	}

	/**
	 * jQuery deserialize plugin based on https://gist.github.com/nissuk/835256
	 *
	 * usage: $('form').deserialize({'name':'value', ...});
	 */
	$.fn.deserialize = function (json/*, options*/) {
		return this.each(function () {
			var key, name, value,
			    self = this,
			    data = {};

			for (key in json) {
				if(json.hasOwnProperty(key)) {
					try {
						name = decodeURIComponent(key); // URIError: malformed URI sequence
						value = decodeURIComponent(json[key]);

						if (!data.hasOwnProperty(name)) { // !(name in data)
							data[name] = [];
						}

						data[name].push(value);
					} catch (e) {
					}
				}
			}

			$.each(data, function (name, val) {
				key = $('[name="' + name + '"]:input', self).val(val);
				if (key.attr('type') !== 'hidden') { // version
					key.before('<span style="color:red">*</span>');
				}
			});
		});
	};

	function deserialize_json(json, clear) {
		if (json) {
			// Set fields on form
			if ('string' === typeof json) {
				json = JSON.parse(json);
			}

			// reset all checkboxes
			if (clear) {
				$('input[type="checkbox"]').prop('checked', false).change();
			}

			// deserialize to the form
			$(ID('#', 'import')).closest('form').deserialize(json);

			// update textfield, checkbox (Exceptions, Mimetype)
			$(ID('@', 'exception_admin') + ',' + ID('@', 'validation_mimetype')).change();

			// update selection
			$('select[name*="' + ID('%', 'settings') + '"]').change();

			// folding list at Login form
			$(ID('@', 'validation_login')).change();

			// Public facing pages
			set_front_end($(ID('@', 'validation_public')));

			// Admin ajax/post
			show_folding_ajax($(ID('@', 'validation_ajax_1')));

			// Additional edge case
			if (clear) {
				clear = ID('%', 'settings[providers][IPInfoDB]');
				$(ID('@', 'providers_IPInfoDB')).prop('checked', json[clear] ? true : false);
			}
		}
	}

	function inArray(val, arr) {
		var i, n = arr.length;
		val = val.replace('…', '');

		for (i = 0; i < n; ++i) {
			if (arr.hasOwnProperty(i) && 0 === arr[i].label.indexOf(val)) {
				return i;
			}
		}

		return -1;
	}

	// Split an array into chunks
	function array_chunk(arr, size) {
		var n = Math.ceil(arr.length / size),
		    r = [], i, j;

		for(i = 0; i < n; ++i) {
			j = i * size;
			r.push(arr.slice(j, j + size));
		}

		return r;
	}

	// google chart
	var chart = {
		// Pie Chart
		dataPie: [],
		viewPie: [],
		drawPie: function (id) {
			var i, data;
			if ('undefined' === typeof chart.dataPie[id]) {
				i = chart.dataPie[id] = new window.google.visualization.DataTable();
				i.addColumn('string', 'Country');
				i.addColumn('number', 'Requests');
				data = $.parseJSON($('#' + id).attr('data-' + id));
				chart.dataPie[id].addRows(data);
			}

			if ('undefined' === typeof chart.viewPie[id]) {
				chart.viewPie[id] = new window.google.visualization.PieChart(
					document.getElementById(id)
				);
			}

			if ('undefined' !== typeof chart.dataPie[id] &&
			    'undefined' !== typeof chart.viewPie[id] &&
			    0 < (i = $('#' + id).width())) {
				chart.viewPie[id].draw(chart.dataPie[id], {
					backgroundColor: { fill: 'transparent' },
					chartArea: {
						left: 0,
						top: '5%',
						width: '100%',
						height: '90%'
					},
					sliceVisibilityThreshold: 0.015
				});
			}
		},

		// Line Chart
		dataLine: [],
		viewLine: [],
		drawLine: function (id, datetype) {
			var i, n, data;
			if ('undefined' === typeof chart.dataLine[id]) {
				i = chart.dataLine[id] = new window.google.visualization.DataTable();
				i.addColumn(datetype, 'Date'   );
				i.addColumn('number', 'comment');
				i.addColumn('number', 'xmlrpc' );
				i.addColumn('number', 'login'  );
				i.addColumn('number', 'admin'  );
				i.addColumn('number', 'public' );
				data = $.parseJSON($('#' + id).attr('data-' + id));
				n = data.length;
				for (i = 0; i < n; ++i) {
					data[i][0] = new Date(data[i][0] * 1000); // [sec] to [msec]
				}
				chart.dataLine[id].addRows(data);
			}

			if ('undefined' === typeof chart.viewLine[id]) {
				chart.viewLine[id] = new window.google.visualization.LineChart(
					document.getElementById(id)
				);
			}

			if ('undefined' !== typeof chart.dataLine[id] &&
			    'undefined' !== typeof chart.viewLine[id] &&
			    0 < (i = $('#' + id).width())) {
				chart.viewLine[id].draw(chart.dataLine[id], {
					legend: { position: 'bottom' },
					backgroundColor: { fill: 'transparent' },
					hAxis: { format: 'MM/dd' + ('datetime' === datetype ? ' HH:mm' : '') },
					vAxis: { textPosition: (i > 320 ? 'out' : 'in') },
					chartArea: {
						left: (i > 320 ? '10%' : 0),
						top: '5%',
						width: '100%',
						height: '75%'
					}
				});
			}
		},

		// Stacked bar
		dataStacked: [],
		viewStacked: [],
		drawStacked: function (id) {
			var i, w, data, range, $id = $('#' + id);

			if ('undefined' === typeof chart.dataStacked[id]) {
				data = $.parseJSON($id.attr('data-' + id));
				if (data) {
					data.unshift(['site', 'comment', 'xmlrpc', 'login', 'admin', 'poblic', { role: 'link' } ]);
					chart.dataStacked[id] = window.google.visualization.arrayToDataTable(data);
				}
			}

			if ('undefined' === typeof chart.viewStacked[id]) {
				chart.viewStacked[id] = new window.google.visualization.BarChart(
					document.getElementById(id)
				);

				// process for after animation
				window.google.visualization.events.addListener(chart.viewStacked[id], 'animationfinish', function (/*event*/) {
					// Make an array of the title in each row.
					var i, a, p,
					    info = [],
					    data = chart.dataStacked[id],
					    n = data.getNumberOfRows(),
					    mode = $(ID('#', 'open-new')).prop('checked');

					for (i = 0; i < n; i++) {
						info.push({
							label: data.getValue(i, 0),
							link:  data.getValue(i, 6)
						});
					}

					// https://stackoverflow.com/questions/12701772/insert-links-into-google-charts-api-data
					n = 'http://www.w3.org/1999/xlink';
					$id.find('text').each(function (i, elm) {
						p = elm.parentNode;
						if ('g' === p.tagName.toLowerCase() && -1 !== (i = inArray(elm.textContent, info))) {
							a = document.createElementNS('http://www.w3.org/2000/svg', 'a');
							a.setAttributeNS(n, 'xlink:href', info[i].link);
							a.setAttributeNS(n, 'title', info[i].label);
							a.setAttribute('target', mode ? '_blank' : '_self');
							a.setAttribute('class', 'site');
							a.appendChild(p.removeChild(elm));
							p.appendChild(a);
							info.splice(i, 1); // for speeding up
						}
					});
				});
			}

			if (0 < (w = $id.width()) &&
			    'undefined' !== typeof chart.dataStacked[id] &&	
			    'undefined' !== typeof chart.viewStacked[id]) {

				i = ID('range');
				range = $.parseJSON($('.' + i).attr('data-' + i));

				data = chart.dataStacked[id];
				i = 40 * data.getNumberOfRows();

				chart.viewStacked[id].draw(data, {
					width: w,
					height: i + 80,
					allowHtml: true,
					isStacked: true,
					legend: { position: 'top' },
					chartArea: {
						top: 50,
						left: 90,
						width: '100%',
						height: i
					},
					hAxis: {
						minValue: 0,
						maxValue: range[1]
					},
					backgroundColor: { fill: 'transparent' },
					animation: {
						startup: true,
						duration: 200,
						easing: 'out'
					}
				});
			}
		},
		ajaxStacked: function (duration, row, col, page) {
			duration = Math.max( 0, Math.min( 4, duration ) );
			row      = Math.max( 1, Math.min( 5, row      ) ) * 5;

			ajax_post(null, {
				cmd: 'restore-network',
				which: duration,
				offset: row * col * page,
				length: row
			}, function (data) {
				var i, j, n, id, dt;

				data = array_chunk(data, row);

				$(ID('.', 'network')).each(function (index, obj) {
					if ('undefined' !== typeof data[index]) {
						id = $(obj).attr('id');
						dt = chart.dataStacked[id];
						n = Math.min(row, data[index].length);
						for (i = 0; i < n; ++i) {
							// [0]:site, [1]:comment, [2]:xmlrpc, [3]:login, [4]:admin, [5]:public, [6]:link
							for (j = 1; j <= 5; j++) {
								dt.setValue(i, j, data[index][i][j]);
							}
						}
						chart.drawStacked(id);
					}
				});
			});
		}
	};

	// google chart
	function drawChart(tabNo) {
		if ('object' === typeof window.google) {
			if (1 === tabNo) {
				chart.drawPie(ID('chart-countries'));
				chart.drawLine(ID('chart-daily'), 'date');
			} else if (5 === tabNo) {
				$(ID('.', 'network')).each(function (i, obj) {
//					chart.drawLine($(obj).attr('id'), 'datetime');
					chart.drawStacked($(obj).attr('id'));
				});
			}
		}
	}

	function initChart(tabNo) {
		if ('object' === typeof window.google) {
			var packages = ['corechart'];
			if (5 === tabNo) {
				packages.push('bar');
			}
			window.google.load('visualization', '1', {
				packages: packages,
				callback: function () {
					drawChart(tabNo);
				}
			});
			onresize('draw-chart.' + tabNo, function () {
				drawChart(tabNo);
			});
		}
	}

	// Load / Save cookie using wpCookies in wp-includes/js/utils.js
	function loadCookie(tabNo) {
		var i, cookie = ('undefined' !== typeof wpCookies && wpCookies.getHash('ip-geo-block')) || [];

		for (i in cookie) {
			if(cookie.hasOwnProperty(i)) {
				cookie[i] = cookie[i].replace(/[^ox\d]/g, '').split(''); // string (ooo...) to array (n)
			}
		}

		if ('undefined' === typeof cookie[tabNo]) {
			cookie[tabNo] = [];
		}

		return cookie;
	}

	// cookie[tabNo][n] = 1 charactor or 'o' if empty
	function saveCookie(cookie) {
		var j, n, c = [];

		$.each(cookie, function(i, obj) {
			c[i] = '';
			if ('undefined' !== typeof obj) {
				n = obj.length;
				if (n) {
					c[i] = (obj[0] || 'o');
					for (j = 1; j < n; ++j) {
						c[i] += (obj[j] || 'o');
					}
				}
			}
		});

		// setHash( name, value, expires, path, domain, secure )
		if ('undefined' !== typeof wpCookies) {
			wpCookies.setHash(
				'ip-geo-block', c, new Date(Date.now() + 2592000000), ip_geo_block_auth.home + ip_geo_block_auth.admin
			);
		}
	}

	// Click event handler to show/hide form-table
	function toggleSection(title, tabNo, cookie) {
		var index = title.closest('fieldset').data('section'),
		    body  = title.parent().nextAll('.panel-body').toggle(), border;

		// Show/Hide
		title.toggleClass(ID('dropup')).toggleClass(ID('dropdown'));

		border = title.hasClass(ID('dropdown'));
		if (border) {
			body.addClass(ID('border')).trigger(ID('show-body'));
		} else {
			body.removeClass(ID('border'));
		}

		cookie[tabNo][index] =  border ? 'o' : 'x';
		saveCookie(cookie);

		// redraw google chart
		drawChart(tabNo);
	}

	function manageSection(tabNo) {
		var cookie = loadCookie(tabNo);

		// Click event handler to show/hide form-table
		$('form').on('click', 'h2,h3', function (/*event*/) {
			toggleSection($(this), tabNo, cookie);
			return false;
		});

		// Toggle all
		$(ID('#', 'toggle-sections')).on('click', function (/*event*/) {
			var $this,
			    title = $(ID('.', 'field')).find('h2,h3'),
			    m = [ID('dropdown'), ID('dropup')],
			    n = title.filter('.' + m[0]).length;

			// update cookie
			title.each(function (i) {
				$this = $(this);
				$this.removeClass(m.join(' ')).addClass(n ? m[1] : m[0]);
				$this = $this.parent().nextAll('.panel-body').toggle(n ? false : true);
				if (n) {
					$this.removeClass(ID('border'));
				} else {
					$this.addClass(ID('border')).trigger('show-body');
				}
				cookie[tabNo][i] = n ? 'x' : 'o';
			});

			// Save cookie
			saveCookie(cookie);

			// redraw google chart
			drawChart(tabNo);

			return false;
		});

		return cookie;
	}

	// form for export / import
	function add_hidden_form(cmd) {
		$('body').append(
			'<div style="display:none">' +
				'<form method="POST" id="' + ID('export-form') + '" action="' + ip_geo_block.url.replace('ajax.php', 'post.php') + '">' +
					'<input type="hidden" name="action" value="' + ip_geo_block.action + '" />' +
					'<input type="hidden" name="nonce" value="' + ip_geo_block.nonce + '" />' +
					'<input type="hidden" name="cmd" value="' + cmd + '" />' +
					'<input type="hidden" name="data" value="" id="' + ID('export-data') + '"/>' +
					'<input type="submit" value="submit" />' +
				'</form>' +
				'<input type="file" name="settings" id="' + ID('file-dialog') + '" />' +
			'</div>'
		);
	}

	// Icons for 'Toggle section' and 'Toggle with non logged-in user'
	function add_icon(dfn, span, title, icon) {
		var i, j;
		i = dfn.cloneNode(false);
		i.setAttribute('title', stripTag(title));
		j = span.cloneNode(false);
		j.setAttribute('class', 'dashicons dashicons-' + icon);
		i.appendChild(j);
		return i;
	}

	/*--------------------------------------------------
	 * DataTables for tab 1 (Statistics) and 4 (Logs)
	 *--------------------------------------------------*/
	function initTable(tabNo, control, options) {
		$.extend(true, $.fn.dataTable.defaults, options, {
			// DOM
			dom: 'tp',

			// Server side
			serverSide: false,

			// Client behavior
			autoWidth: false,
			processing: true,
			deferRender: true,
			deferLoading: 10,

			// Interface
			info: false,
			lengthChange: false,

			// Language
			language: {
				emptyTable:     ip_geo_block.i18n[1],
				loadingRecords: ip_geo_block.i18n[0],
				processing:     ip_geo_block.i18n[0],
				zeroRecords:    ip_geo_block.i18n[2],
				paginate: {
					first:    '&laquo;',
					last:     '&raquo;',
					next:     '&rsaquo;',
					previous: '&lsaquo;'
				}
			},

			// Responsive
			responsive: {
				details: {
					type: 'column',
					target: 'td:nth-child(n+2)'
				}
			},

			columnDefs: [
				{ width:   '1.25em', targets: 0 },
				{ orderable:  false, targets: 0 },
				{ searchable: false, targets: 0 },
				{
					targets: [0],
					data: null,
					defaultContent: '<input type="checkbox">'
				}
			],

			// Pagenation
			pagingType: 'full_numbers', // or 'simple_numbers'
			pageLength: 10,

			// scroller
			scroller: true,
			scrollY: 10000, // prevent to change column width on click
			scrollCollapse: true, // fit the height of table

			// draw callback
			drawCallback: function (settings) {
				var elm = $(ID('#', control.tableID)).find('td.dataTables_empty');

				// avoid recursive call for ajax source
				// 1: thead, 2: empty tbody, 3: after loading data
				if (3 > settings.iDraw) {
					elm.html(ip_geo_block.i18n[0]);
				}
				else if (3 === settings.iDraw) {
					// 'No data available in table'
					elm.html(ip_geo_block.i18n[1]);

					elm = $(ID('@', 'search_filter'));
					if (elm.val()) { // if a filter value exists in the text field
						elm.trigger('keyup'); // then search the text
					}
				}
			}
		});

		// Instantiate DataTables
		var table = $(ID('#', control.tableID)).DataTable({
			ajax: {
				url: ip_geo_block.url,
				type: 'POST',
				data: {
					cmd:    control.ajaxCMD,
					action: ip_geo_block.action,
					nonce:  ip_geo_block.nonce
				}
			},
			mark: true // https://github.com/julmot/datatables.mark.js/
		}),

		// redraw when column size changed
		redraw = function () {
			table.columns.adjust().responsive.recalc().draw(false); // full-hold
		};

		// draw when window is resized
		onresize('draw-table.' + tabNo, redraw);

		// Re-calculate the widths after panel-body is shown
		$(ID('#', control.sectionID)).find('.panel-body').off(ID('show-body')).on(ID('show-body'), function (/*event*/) {
			redraw();
			return false;
		})

		// Handle the event of checkbox in the title header for bulk action
		.off('change').on('change', 'th>input[type="checkbox"]', function (/*event*/) {
			var prop = $(this).prop('checked');
			$(ID('#', control.tableID)).find('td>input[type="checkbox"]').prop('checked', prop);
			return false;
		});

		// Select target (radio button)
		$(ID('#', 'select-target')).off('change').on('change', function (/*event*/) {
			var val = $(this).find('input[name="' + ID('target') + '"]:checked').val();
			// search only the specified column for selecting "Target"
			table.columns(control.targetColumn).search('all' !== val ? val : '').draw();
			return false;
		}).trigger('change');

		// Bulk action
		$(ID('#', 'bulk-action')).off('click').on('click', function (/*event*/) {
			var cmd  = $(this).prev().val(), // value of selected option
			    rexp = /(<([^>]+)>)/ig,      // regular expression to strip tag
			    data = { IP: [], AS: [] },   // IP address and AS number
			    cell, cells = $('table.dataTable').find('td>input:checked');

			if (!cmd) {
				return false;
			} else if (!cells.length) {
				warning(null, ip_geo_block.msg[11]);
				return false;
			}

			cells.each(function (/*index*/) {
				cell = table.cell(this.parentNode).data();
				data.IP.push(cell[control.columnIP].replace(rexp, ''));
				data.AS.push(cell[control.columnAS].replace(rexp, ''));
			});

			if (data.IP.length) {
				ajax_post('loading', {
					cmd: cmd,
					which: data
				}, function (data) {
					if ('undefined' !== typeof data.page) {
						redirect(data.page, 'tab=' + tabNo);
					} else if (data) {
						table.ajax.reload();
						$(ID('#', control.tableID)).find('th input[type="checkbox"]').prop('checked', false);
					}
				});
			}

			return false;
		});

		// Search filter
		$(ID('@', 'search_filter')).off('keyup').on('keyup', function (/*event*/) {
			table.search(this.value, false, true, !/[A-Z]/.test(this.value)).draw();
			return false;
		});

		// Reset filter
		$(ID('#', 'reset-filter')).off('click').on('click', function (/*event*/) {
			$(ID('@', 'search_filter')).val('');
			table.search('').draw();
			return false;
		});

		// Clear all
		$(ID('@', 'clear_all')).off('click').on('click', function (/*event*/) {
			confirm(ip_geo_block.msg[tabNo === 1 ? 4 : 5], function () {
				ajax_clear(tabNo === 1 ? 'cache' : 'logs', null);
			});
			return false;
		});

		// Jump to search tab with opening a new window
		// @note: `click` cannot be `off` because it's a root.
		$('table.dataTable tbody').on('click', 'a', function (/*event*/) {
			var p = window.location.search.slice(1).split('&'),
			    n = p.length, q = {}, i, j;

			for (i = 0; i < n; ++i) {
				j = p[i].split('=');
				q[j[0]] = j[1];
			}

			// additional query
			q.tab = tabNo === 1 ? 4 : 2;
			q.s = $(this).text().replace(/[^\w\.\:\*]/, '');

			j = [];
			for (i in q) {
				if (q.hasOwnProperty(i)) {
					j.push(i + '=' + q[i]);
				}
			}

			window.open(window.location.pathname + '?' + j.join('&'), '_blank');
			return false;
		});

		return table;
	}

	$(function () {
		// Get tab number
		var tabNo = Number(ip_geo_block.tab) || 0,

		// Attach event handler and manage cookie
		cookie = manageSection(tabNo);

		// Inhibit to submit by return key
		$(ID('.', 'inhibit')).on('submit', function () {
			return false;
		});

		// Register event handler at specific tab
		switch (tabNo) {
		  /*----------------------------------------
		   * Settings
		   *----------------------------------------*/
		  case 0:
			// Name of base class
			var name = ID('%', 'settings');

			/*---------------------------
			 * Validation rule settings
			 *---------------------------*/
			// Scan your country code
			$('[id^="' + ID('scan-') + '"]').on('click', function (/*event*/) {
				var $this = $(this),
				    id = $this.attr('id'),
				    parent = $this.parent();

				ajax_post(id.replace(/^.*(?:scan)/, 'scanning'), {
					cmd: 'scan-code',
					which: id.replace(ID('scan-'), '')
				}, function (data) {
					if (!parent.children('ul').length) {
						parent.append('<ul id="' + ID('code-list') + '"></ul>');
					}
					parent = parent.children('ul').empty();

					var key, val;
					for (key in data) {
						if (data.hasOwnProperty(key)) {
							key = stripTag(key);
							if ('string' === typeof data[key]) {
								val = stripTag(data[key]);
							} else {
								val = stripTag(data[key].code);
								key = '<abbr title="' + stripTag(data[key].type) + '">' + key + '</abbr>';
							}
							parent.append('<li>' + key + ' : <span class="' + ID('notice') + '">' + val + '</span></li>');
						}
					}
					parent.show('slow');
				});

				return false;
			});

			// Matching rule
			$(ID('@', 'matching_rule')).on('change', function () {
				var value = this.value;
				$(ID('@', 'white_list')).closest('tr').toggle(value === '0');
				$(ID('@', 'black_list')).closest('tr').toggle(value === '1');
				return false;
			}).change();

			// Show/Hide folding list at prevent malicious upload
			$(ID('@', 'validation_mimetype')).on('change', function (event) {
				var $this = $(this),
				    stat = parseInt($this.val(), 10);
				$this.nextAll(ID('.', 'settings-folding')).each(function (i, obj) {
					fold_elements($(obj), (stat === i + 1) || (stat && 2 === i));
				});
				return stopPropergation(event);
			}).change();

			// Response message and Redirect URL
			$('select[name*="response_code"]').on('change', function (event) {
				var $this = $(this),
				    res = parseInt($this.val() / 100, 10),
				    elm = $this.closest('tr').nextAll('tr');

				// only for Front-end target settings
				if (0 <= $this.attr('name').indexOf('public')) {
					if (-1 === parseInt($(ID('@', 'public_matching_rule')).val(), 10)) {
						elm.each(function (index) {
							if (1 >= index) {
								$(this).hide();
							}
						});
						return stopPropergation(event);
					}
				}

				if (res <= 3) { // 2xx, 3xx
					elm.each(function (index) {
						if      (0 === index) { $(this).show(); } // redirect_uri
						else if (1 === index) { $(this).hide(); } // response_msg
					});
				} else { // 4xx, 5xx
					elm.each(function (index) {
						if      (0 === index) { $(this).hide(); } // redirect_uri
						else if (1 === index) { $(this).show(); } // response_msg
					});
				}
				return stopPropergation(event);
			}).change();

			// Decode
			$(ID('#', 'decode')).on('click', function (/*event*/) {
				var elm = $(ID('@', 'signature')),
				    str = elm.val();
				if (str.search(/,/) === -1) {
					elm.val(decode_str(str));
				} else {
					elm.val(encode_str(str));
				}
				return false;
			});

			/*---------------------------
			 * Back-end target settings
			 *---------------------------*/
			// Show/Hide folding list at Login form
			$(ID('@', 'validation_login')).on('change', function (event) {
				var $this = $(this);
				show_descendants($this, $this, name, true);
				return stopPropergation(event);
			}).change();

			// Exceptions for Admin ajax/post
			ajax_post(null, {
				cmd: 'get-actions'
			}, function (data) {
				var i, j, id, key, $this = $(ID('#', 'list-admin')),
				    li    = document.createElement('li'   ),
				    input = document.createElement('input'),
				    label = document.createElement('label'),
				    dfn   = document.createElement('dfn'  ),
				    span  = document.createElement('span' );

				for (key in data) {
					if (data.hasOwnProperty(key)) {
						key = stripTag(key);
						if (!$this.find('#' + (id = ID('%', key))).size()) {
							i = input.cloneNode(false);
							i.setAttribute('id', id);
							i.setAttribute('value', key);
							i.setAttribute('type', 'checkbox');
							j = li.cloneNode(false);
							j.appendChild(i);

							i = label.cloneNode(false);
							i.setAttribute('for', id);
							i.appendChild(document.createTextNode(key));
							j.appendChild(i);

							if (1 & data[key]) {
								j.appendChild(add_icon(dfn, span, ip_geo_block.msg[6], 'lock'));
							}
							if (2 & data[key]) {
								j.appendChild(add_icon(dfn, span, ip_geo_block.msg[7], 'unlock'));
							}

							$this.append(j);
						}
					}
				}

				// Admin ajax/post: `Toggle non logged-in user` at `Exceptions`
				$(ID('.', 'icon-unlock')).on('click', function (/*event*/) {
					$(ID('#', 'list-admin') + '>li').filter(function (/*i, elm*/) {
						return ! $(this).find('.dashicons-unlock').length;
					}).toggle();
					return false;
				});

				// Admin ajax/post: Handle text field for actions
				$(ID('@', 'exception_admin')).on('change', function (event) {
					var actions = $.grep($(this).val().split(','), function (e){
						return '' !== e.replace(/^\s+|\s+$/g, ''); // remove empty element
					});

					$(ID('#', 'list-admin')).find('input').each(function (/*i, obj*/) {
						var $this = $(this),
							action = $this.val();
						$this.prop('checked', -1 !== $.inArray(action, actions));
					});

					return stopPropergation(event);
				}).change();

				// Admin ajax/post: Candidate actions
				$(ID('#', 'list-admin')).on('click', 'input', function (/*event*/) {
					var i,
					    $this = $(this),
					    $text = $(ID('@', 'exception_admin')),
					    action = $this.val(),
					    actions = $.grep($text.val().split(','), function (e) {
					    	return '' !== e.replace(/^\s+|\s+$/g, ''); // remove empty element
					    });

					// find the action
					i = $.inArray(action, actions);

					if (-1 === i) {
						actions.push(action);
					} else {
						actions.splice(i, 1);
					}

					$text.val(actions.join(',')).change();
				});

				// Admin ajax/post: Find the blocked request in logs
				$(ID('.', 'icon-find')).on('click', function (/*event*/) {
					var $this  = $(this),
					    list = [], n = 0, key, ext, id, s,
					    title  = stripTag(ip_geo_block.msg[9]),
					    target = stripTag($this.data('target')); // `admin`, `plugins`, `themes`

					// show description
					$(ID('#', 'find-' + target)).empty();
					$this.next().children(ID('.', 'find-desc')).show();

					// make list of target
					$this = $(ID('#', 'list-' + target));
					$this.children('li').each(function (i, obj) {
						list.push($(obj).find('input').val());
					});

					ajax_post('find-' + target, {
						cmd: 'find-' + target
					}, function (data) {
						var val;
						for (val in data) {
							if (data.hasOwnProperty(val)) {
								++n;
								key = stripTag(data[val]);  // page, action, plugins, themes
								val = stripTag(val);        // slug of target
								ext = $.inArray(val, list); // slug already exists
								id  = ID('!', 'exception_' + target + '_' + val);

								// make an anchor tab with search query
								s = 'admin' === target ? key + '=' + val : '/' + key + '/' + val + '/';
								s = '<a class="ip-geo-block-icon ip-geo-block-icon-alert" href="?page=ip-geo-block&tab=4&s='
								+ encodeURIComponent(s) + '" title="' + title.replace('%s', s) + '" target="_blank"><span></span></a>';

								// add a new list when not found in existent key
								if (ext < 0) {
									list.push(val);
									$this.prepend(
										'<li><input id="' + id + '" value="' + val + '" type="checkbox" '
										+ ('admin' === target ? '/>' : 'name=ip_geo_block_settings[exception][' + target + '][' + val + '] />')
										+ '<label for="' + id + '">'+ val + '</lable>' + s + '</li>'
									);
								}

								// append button when found in existent key
								else {
									id = $this.find('#' + id).parent();
									if (!id.find('a').length) {
										id.append(s);
									}
								}
							}
						}

						// update status of checkbox
						$(ID('@', 'exception_' + target)).trigger('change');
						$(ID('#', 'find-' + target)).append(
							' ' + '<span class="ip-geo-block-found">' + stripTag(ip_geo_block.msg[8].replace('%d', n)) + '</span>'
						);
					});

					return false;
				});
			});

			// Admin ajax/post: Enable / Disable Exceptions
			$('input[id^="' + ID('!', 'validation_ajax_') + '"]').on('change', function (/*event*/) {
				show_folding_ajax($(this));
			}).change();

			/*---------------------------
			 * Front-end target settings
			 *---------------------------*/
			// Enable / Disable for Public facing pages
			$(ID('@', 'validation_public')).on('change', function (event) {
				set_front_end($(this));
				return stopPropergation(event);
			}).change();

			// Matching rule on front-end
			$(ID('@', 'public_matching_rule')).on('change', function (event) {
				var value = this.value;
				$(ID('@', 'public_white_list'   )).closest('tr').toggle(value ===  '0');
				$(ID('@', 'public_black_list'   )).closest('tr').toggle(value ===  '1');
				$(ID('@', 'public_response_code')).change().closest('tr').toggle(value !== '-1');
				return stopPropergation(event);
			}).change();

			/*---------------------------
			 * Local database settings
			 *---------------------------*/
			// Update local database
			$(ID('@', 'update')).on('click', function (/*event*/) {
				ajax_post('download', {
					cmd: 'download'
				}, function (res) {
					var api, key, data;
					for (api in res) {
						if (res.hasOwnProperty(api)) {
							data = res[api];
							for (key in data) { // key: ipv4, ipv6
								if (data.hasOwnProperty(key)) {
									key = stripTag(key);
									if (data[key].filename) {
										$(ID('@', api + '_' + key + '_path')).val(stripTag(data[key].filename));
									}
									if (data[key].message) {
										$(ID('#', api + '-' + key)).text(stripTag(data[key].message));
									}
								}
							}
						}
					}
				});

				return false;
			});

			/*--------------------------------
			 * Statistics and Logs settings
			 *--------------------------------*/
			$(ID('@', 'save_statistics')).on('change', function (/*event*/) {
				$(ID('@', 'validation_recdays')).prop('disabled', !$(this).prop('checked'));
				return false;
			}).trigger('change');

			$(ID('@', 'validation_reclogs')).on('change', function (/*event*/) {
				var $this = $(this);
				$this.parent().parent().nextAll().find('input').prop('disabled', 0 === Number($this.prop('selectedIndex')));
			}).trigger('change');

			/*---------------------------
			 * Submission settings
			 *---------------------------*/
			$(ID('@', 'comment_pos')).on('change', function (/*event*/) {
				var $this = $(this);
				$this.nextAll('input[type="text"]').prop('disabled', 0 === Number($this.prop('selectedIndex')));
			}).trigger('change');

			/*---------------------------
			 * Plugin settings
			 *---------------------------*/
			// Export / Import settings
			add_hidden_form('validate');

			// Export settings
			$(ID('#', 'export')).on('click', function (/*event*/) {
				if ('undefined' === typeof JSON) {
					notice_html5();
					return false;
				}

				var id = name, json = {};
				$.each($(this).closest('form').serializeArray(), function (i, obj) {
					if (-1 !== obj.name.indexOf(id)) {
						json[obj.name] = obj.value;
					}
				});

				json[id += '[signature]'] = encode_str(json[id]);
				$(ID('#', 'export-data')).val(JSON.stringify(json));
				$(ID('#', 'export-form')).submit();

				return false;
			});

			// Import settings
			$(ID('#', 'file-dialog')).on('change', function (event) {
				if ('undefined' === typeof window.FileReader) {
					notice_html5();
					return false;
				}

				var id, file = event.target.files[0];
				if (file) {
					readfile(file, function (data) {
						data = JSON.parse(data);
						id = name + '[signature]';
						if ('undefined' !== typeof data[id]) {
							data[id] = encode_str(data[id]);
						}
						ajax_post('export-import', {
							cmd: 'validate',
							data: JSON.stringify(data)
						}, function (data) {
							deserialize_json(data, true);
						});
					});
				}

				return false;
			});

			$(ID('#', 'import')).on('click', function (/*event*/) {
				$(ID('#', 'file-dialog')).click();
				return false;
			});

			// Import pre-defined settings
			$(ID('#', 'default')).on('click', function (/*event*/) {
				confirm(ip_geo_block.msg[0], function () {
					ajax_post('pre-defined', {
						cmd: 'import-default'
					}, function (data) {
						deserialize_json(data, true);
					});
				});
				return false;
			});

			$(ID('#', 'preferred')).on('click', function (/*event*/) {
				confirm(ip_geo_block.msg[0], function () {
					ajax_post('pre-defined', {
						cmd: 'import-preferred'
					}, function (data) {
						deserialize_json(data, false);
					});
				});
				return false;
			});

			// Reset data source for live log
			$(ID('@', 'reset_live')).on('click', function (/*event*/) {
				ajax_post('reset-live', {
					cmd: 'reset-live'
				});
				return false;
			});

			// Manipulate DB table for validation logs
			$(ID('@', 'create_table')).on('click', function (/*event*/) {
				confirm(ip_geo_block.msg[1], function () {
					ajax_table('create-table');
				});
				return false;
			});

			$(ID('@', 'delete_table')).on('click', function (/*event*/) {
				confirm(ip_geo_block.msg[2], function () {
					ajax_table('delete-table');
				});
				return false;
			});

			// Show WordPress installation info
			$(ID('#', 'show-info')).on('click', function (/*event*/) {
				$(ID('#', 'wp-info')).empty();
				ajax_post('wp-info', {
					cmd: 'show-info'
				}, function (data) {
					var key, res = [];
					for (key in data) {
						if (data.hasOwnProperty(key)) {
							res.push('- ' + key + ' ' + data[key]);
						}
					}

					// response should be escaped at server side
					$(ID('#', 'wp-info')).html('<textarea class="regular-text code" rows="' + res.length + '">' + /*stripTag*/(res.join("\n")) + '</textarea>').find('textarea').select();
					return false;
				});
			});

			/*---------------------------
			 * Common event handler
			 *---------------------------*/
			// Show/Hide description (this change event hander should be at the last)
			$('select[name^="' + name + '"]').on('change', function (/*event*/) {
				var $this = $(this);
				show_description($this);
				show_descendants($this, $this, name, true);
				return false;
			}).change();

			// Toggle checkbox
			$(ID('.', 'icon-cycle')).on('click', function (/*event*/) {
				var $that = $(this).nextAll('li'), actions,
				    text  = $that.find(ID('@', 'exception_admin')),
				    cbox  = $that.find('input:checkbox').filter(':visible'),
				    stat  = cbox.filter(':checked').length;

				cbox.prop('checked', !stat);

				if (text.length) {
					if (stat) {
						text.val('');
					} else {
						actions = [];
						cbox.each(function (i, obj) {
							actions.push($(obj).val());
						});
						text.val(actions.join(','));
					}
				}

				$(this).blur(); // unfocus anchor tag
				return false;
			});

			// Folding list
			$(ID('.', 'settings-folding>dfn')).on('click', function (/*event*/) {
				var drop = ID('drop'),
				$this = $(this).parent();
				$this.children(ID('.', 'hide')).toggle();
				$this.toggleClass(drop + 'up').toggleClass(drop + 'down');

				if ($this.hasClass(drop + 'up')) {
					$this.children('div').hide();
				}

				return false;
			});

			// Submit
			$('#submit').on('click', function (/*event*/) {
				var elm = $(ID('@', 'signature')),
				    str = elm.val();
				if (str.indexOf(',') !== -1) {
					elm.val(encode_str(str));
				}
				return true;
			});
			break;

		  /*----------------------------------------
		   * Statistics
		   *----------------------------------------*/
		  case 1:
			// https://developers.google.com/loader/#Dynamic
			initChart(tabNo);

			// Toggle sorting order
			var order = 0;
			$(ID('#', 'sort-slug')).on('click', function (/*event*/) {
				var $ol = $(this).closest('ol'),
				    $li = $ol.children('li');

				// toggle sorting
				order = !order;
				if (order) {
					$li.sort(function (a, b) {
						return $(a).text() > $(b).text();
					});
				} else {
					$li.sort(function (a, b) {
						return parseInt($(a).text().replace(/^.*\((\d+)\)$/, '$1'), 10) <= parseInt($(b).text().replace(/^.*\((\d+)\)$/, '$1'), 10);
					});
				}

				$ol.children('li').remove();
				$li.appendTo($ol);
			});

			// Statistics of validation
			$(ID('@', 'clear_statistics')).on('click', function (/*event*/) {
				confirm(ip_geo_block.msg[3], function () {
					ajax_clear('statistics', null);
				});
				return false;
			});

			// Statistics in logs
			$(ID('@', 'clear_logs')).on('click', function (/*event*/) {
				confirm(ip_geo_block.msg[5], function () {
					ajax_clear('logs', null);
				});
				return false;
			});

			// Statistics in cache
			initTable(tabNo, {
				tableID:   'statistics-cache',
				ajaxCMD:   'restore-cache',
				sectionID: 'section-2',
				targetColumn: 4,
				columnIP: 1,
				columnAS: 3
			}, {
				columns: [
					{ title: '<input type="checkbox">' }, // 0 checkbox
					{ title: ip_geo_block.i18n[3]      }, // 1 IP address
					{ title: ip_geo_block.i18n[4]      }, // 2 Country code
					{ title: ip_geo_block.i18n[5]      }, // 3 AS number
					{ title: ip_geo_block.i18n[6]      }, // 4 Host name
					{ title: ip_geo_block.i18n[7]      }, // 5 Target
					{ title: ip_geo_block.i18n[8]      }, // 6 Login fail/Call
					{ title: ip_geo_block.i18n[9]      }  // 7 Elapsed[sec]
				],
				columnDefs: [
					{ responsivePriority:  0, targets: 0 }, // checkbox
					{ responsivePriority:  1, targets: 1 }, // IP address
					{ responsivePriority:  2, targets: 2 }, // Country code
					{ responsivePriority:  6, targets: 3 }, // AS number
					{ responsivePriority:  7, targets: 4 }, // Host name
					{ responsivePriority:  3, targets: 5 }, // Target
					{ responsivePriority:  4, targets: 6 }, // Login fail/Call
					{ responsivePriority:  5, targets: 7 }, // Elapsed[sec]
					{ className: "all",       targets: [0, 1, 2, 5] } // always visible
				]
			});
			break;

		  /*----------------------------------------
		   * Logs
		   *----------------------------------------*/
		  case 4:
			// Validation logs
			var control = {
				tableID:   'validation-logs',
				sectionID: 'section-0',
				targetColumn: 6,
				columnIP: 3,
				columnAS: 5
			},
			options = {
				columns: [
					{ title: '<input type=\"checkbox\">' }, //  0 checkbox
					{ title: ''                          }, //  1 Time (raw)
					{ title: ip_geo_block.i18n[10]       }, //  2 Date
					{ title: ip_geo_block.i18n[ 3]       }, //  3 IP address
					{ title: ip_geo_block.i18n[ 4]       }, //  4 Country code
					{ title: ip_geo_block.i18n[ 5]       }, //  5 AS number
					{ title: ip_geo_block.i18n[ 7]       }, //  6 Target
					{ title: ip_geo_block.i18n[11]       }, //  7 Result
					{ title: ip_geo_block.i18n[12]       }, //  8 Request
					{ title: ip_geo_block.i18n[13]       }, //  9 User agent
					{ title: ip_geo_block.i18n[14]       }, // 10 HTTP headers
					{ title: ip_geo_block.i18n[15]       }  // 11 $_POST data
				],
				columnDefs: [
					{ responsivePriority: 11, targets:  0 }, // checkbox
					{ responsivePriority:  0, targets:  1 }, // Time (raw)
					{ responsivePriority:  1, targets:  2 }, // Date
					{ responsivePriority:  2, targets:  3 }, // IP address
					{ responsivePriority:  3, targets:  4 }, // Country code
					{ responsivePriority:  6, targets:  5 }, // AS number
					{ responsivePriority:  4, targets:  6 }, // Target
					{ responsivePriority:  5, targets:  7 }, // Result
					{ responsivePriority:  7, targets:  8 }, // Request
					{ responsivePriority:  8, targets:  9 }, // User agent
					{ responsivePriority:  9, targets: 10 }, // HTTP headers
					{ responsivePriority: 10, targets: 11 }, // $_POST data
					{ visible:   false,       targets:  1 }, // always hidden
					{ className: "all",       targets: [0, 2,  3,  4] }, // always visible
					{ className: "none",      targets: [8, 9, 10, 11] }  // always hidden
				]
			},

			// Timer for Live update and DataTables
			timer_start = null,
			timer_pause = null,
			$timer_pause = $(ID('#', 'live-loading')),
			table = null,

			// Controler functions for Live update
			clear_timer = function () {
				if (timer_start) {
					window.clearTimeout(timer_start);
					timer_start = null;
				}
				if (timer_pause) {
					$timer_pause.removeClass(ID('live-timer'));
					window.clearTimeout(timer_pause);
					timer_pause = null;
				}
			},
			live_start = function () {
				clear_timer();
				ajax_post('live-loading', {
					cmd: 'live-start'
				}, function (res) {
					if (res.error) {
						warning(null, res.error);
					}
					else if (res.data.length) {
						var i, n = res.data.length;
						for (i = 0; i < n; i++) {
							table.row.add(res.data[i]); // `raws.add()` doesn't work because it needs js literal object.
						}
						table.draw(false); // the current page will still be shown.
					}
					timer_start = window.setTimeout(live_start, ip_geo_block.interval * 1000);
				});
			},
			live_stop = function (cmd, callback) {
				clear_timer();
				ajax_post(null, {
					cmd: cmd || 'live-stop',
					callback: callback
				});
			},
			live_pause = function () {
				live_stop('live-pause', function () {
					$timer_pause.addClass(ID('live-timer'));
					timer_pause = window.setTimeout(function () {
						clear_timer();
						$(ID('#', 'live-log-stop')).prop('checked', true);
					}, ip_geo_block.timeout * 1000);
				});
			},

			// animation on update
			new_class = ID(''),
			add_class = function (row, data, prefix) {
				if (-1 !== data[7 /* result */].indexOf('passed')) {
					$(row).addClass(new_class + prefix + 'passed');
				} else {
					$(row).addClass(new_class + prefix + 'blocked');
				}
			},

			// Live update controler and mode
			$cntl = $(ID('#', 'live-log')),
			$mode = $(ID('#', 'live-update'));

			// Remove animation class when animation finished
			$(ID('#', 'validation-logs')).on('animationend', function (/*event*/) {
				$(this).find('tr[class*="' + new_class + 'new' + '"]').each(function (/*index, obj*/) {
					var $this = $(this);
					if (-1 !== $this.prop('class').indexOf('passed')) {
						$this.addClass(new_class + 'passed').removeClass(new_class + 'new-passed');
					} else {
						$this.addClass(new_class + 'blocked').removeClass(new_class + 'new-blocked');
					}
				});
				return false;
			});

			// Control of live update
			$cntl.on('change', function (/*event*/) {
				switch($('input[name="' + ID('live-log') + '"]:checked').val()) {
				  case 'start':
					live_start();
					break;
				  case 'pause':
					live_pause();
					break;
				  case 'stop':
					live_stop();
					break;
				}
			});

			// on change mode
			$mode.on('change', function (/*event*/) {
				var $tr = $cntl.closest('tr'),
				    mode = $mode.prop('checked'); // checked in `display_plugin_admin_page()`

				cookie[tabNo][1] = mode ? 'o' : 'x';
				saveCookie(cookie);

				// Delete old DataTables
				if (table) {
					table.clear().destroy();
				}

				if (mode) {
					$tr.show().next().next().next().nextAll().hide();
					control.ajaxCMD = 'live-stop';
					options.order = [1, 'desc']; // sort by `Time (raw)`
					options.createdRow = function (row, data/*, index*/) {
						add_class(row, data, 'new-');
					};
				} else {
					$tr.hide().next().next().next().nextAll().show();
					control.ajaxCMD = 'restore-logs';
					options.order = [0, ''];
					options.createdRow = function (row, data/*, index*/) {
						add_class(row, data, '');
					};
				}

				// Re-initialize DataTables
				$(ID('#', 'live-log-stop')).trigger('click');
				table = initTable(tabNo, control, options);
				return false;
			}).trigger('change');

			// Export / Import settings
			add_hidden_form('export-logs');

			// Export logs
			$(ID('#', 'export-logs')).on('click', function (/*event*/) {
				$(ID('#', 'export-form')).submit();
				return false;
			});
			break;

		  /*----------------------------------------
		   * Search
		   *----------------------------------------*/
		  case 2:
			// Google Maps API error
			$(window).on(ID('gmap-error'), function () {
				ajax_post(null, { cmd: 'gmap-error' }, function (data) {
					redirect(data.page, data.tab);
				});
			});

			// Initialize map if exists
			var map = $(ID('#', 'map'));
			if ('object' === typeof window.google) {
				// Initialize map if exists
				map.each(function () {
					$(this).GmapRS();
				});
			} else {
				map.each(function () {
					$(this).empty().html(
						'<iframe src="' + ip_geo_block.altgmap + '?output=embed" frameborder="0" style="width:100%; height:400px; border:0" allowfullscreen></iframe>'
					);
				});
			}

			// Set selected provider to cookie
			$('select[id^="' + ID('!', 'service') + '"]').on('change', function (/*event*/) {
				cookie[tabNo][3] = $(this).prop('selectedIndex');
				saveCookie(cookie);
			}).change();

			// Search Geolocation
			$(ID('@', 'get_location')).on('click', function (/*event*/) {
				var whois = $(ID('#', 'whois')), obj,
				    ip = $(ID('@', 'ip_address')).val();

				if (ip) {
					whois.hide().empty();

					// Get whois data
					obj = $.whois(ip, function (data) {
						var i, str = '';
						for (i = 0; i < data.length; ++i) {
							str +=
							'<tr>' +
								'<td>' + data[i].name  + '</td>' +
								'<td>' + data[i].value + '</td>' +
							'</tr>';
						}

						whois.html(
							'<fieldset id="' + ID('section-1') + '" class="' + ID('field') + ' panel panel-default" data-section="1">' +
							'<legend class="panel-heading"><h3 id="' + ID('whois-title') + '" class="' + ID('dropdown') + '">Whois</h3></legend>' +
							'<div class="panel-body ' + ID('border') + '"><table class="' + ID('table') + '">' + str + '</table></div>' +
							'</fieldset>'
						).fadeIn('slow');

						$(ID('#', 'whois-title')).on('click', function (/*event*/) {
							var $this = $(this);
							$this.parent().nextAll().toggle();
							$this.toggleClass(ID('dropup')).toggleClass(ID('dropdown'));
							return false;
						});
					});

					// Show map
					ajax_post('loading', {
						cmd: 'search',
						ip: ip,
						which: $(ID('@', 'service')).val()
					}, function (data) {
						var key, info = '',
						    latitude  = stripTag(data.latitude  || '0'),
						    longitude = stripTag(data.longitude || '0'),
						    zoom = (data.latitude || data.longitude) ? 8 : 2;

						for (key in data) {
							if (data.hasOwnProperty(key)) {
								key = stripTag(key);
								info +=
									'<li>' +
										'<span class="' + ID('title' ) + '">' + key + ' : </span>' +
										'<span class="' + ID('result') + '">' + stripTag(data[key]) + '</span>' +
									'</li>';
							}
						}

						if ('object' === typeof window.google) {
							map.GmapRS('addMarker', {
								latitude: latitude,
								longitude: longitude,
								title: ip,
								content: '<ul>' + info + '</ul>',
								show: true,
								zoom: zoom
							});
						} else {
							map.css({
								height: '600px',
								backgroundColor: 'transparent'
							}).empty().html(
								'<ul style="margin-top:0; margin-left:1em;">' +
									'<li>' +
										'<span class="' + ID('title' ) + '">' + 'IP address' + ' : </span>' +
										'<span class="' + ID('result') + '">' + stripTag(ip) + '</span>' +
									'</li>' +
									info +
									/*'<li>' +
										'<span class="' + ID('title' ) + '">' + 'show map' + ' : </span>' +
										'<span class="' + ID('result') + '">' + '<a href="//maps.google.com/maps?q=' + latitude + ',' + longitude + '">Click here</a>' + '</span>' +
									'</li>' +*/
								'</ul>'
								+ '<iframe src="//maps.google.com/maps?q=' + latitude + ',' + longitude + '&z=' + zoom + '&output=embed" frameborder="0" style="width:100%; height:400px; border:0" allowfullscreen></iframe>'
							);
						}
					}, [obj]);
				}

				return false;
			});

			// Preset IP address
			if ($(ID('@', 'ip_address')).val()) {
				$(ID('@', 'get_location')).click();
			}
			break;

		  /*----------------------------------------
		   * Sites
		   *----------------------------------------*/
		  case 5:
			// https://developers.google.com/loader/#Dynamic
			initChart(tabNo);

			// Duration to retrieve
			// [0]:Section, [1]:Open a new window, [2]:Duration to retrieve, [3]:Row, [4]:Column
			$('input[name=' + ID('duration') + ']:radio').on('click', function (/*event*/) {
				var page = $('div[class*="paginate"]').find('a[class*="current"]').text();
				cookie[tabNo][2] = $(this).val()    || 0; // Duration to retrieve
				cookie[tabNo][3] = cookie[tabNo][3] || 2; // Rows
				cookie[tabNo][4] = cookie[tabNo][4] || 1; // Columns
				saveCookie(cookie);
				chart.ajaxStacked(cookie[tabNo][2], cookie[tabNo][3], cookie[tabNo][4], page - 1);
			});

			// Open a new window
			$(ID('#', 'open-new')).on('change', function (/*event*/) {
				var mode = $(this).prop('checked');
				cookie[tabNo][1] = mode ? 'o' : 'x';
				saveCookie(cookie);
				$(ID('#', 'section-0 svg')).find('a').each(function (/*index, obj*/) {
					this.setAttribute('target', mode ? '_blank' : '_self');
				});
			});

			// Chart display layout
			$(ID('#', 'apply-layout')).on('click', function (/*event*/) {
				var $select = $(ID('#', 'select-layout'));
				cookie[tabNo][3] = $select.find('select[name="rows"] option:selected').val();
				cookie[tabNo][4] = $select.find('select[name="cols"] option:selected').val();
				saveCookie(cookie);
			});

			// Correct the `current` class because of the structure of sub manu.
			$('ul.wp-submenu>li.wp-first-item').removeClass('current').next().addClass('current');
			break;
		}
	}); // document.ready()

}(jQuery, window, document));