/*!
 * Project: DataTables for WordPress IP Geo Block
 * Copyright (c) 2015-2017 tokkonopapa (tokkonopapa@yahoo.com)
 * This software is released under the MIT License.
 */
(function ($) {
	'use strict';

	var lang = window.navigator.language || window.navigator.userLanguage;
	lang = lang.indexOf('ja') !== -1 ? 'ja-JP.json' : 'en-US.json';

	$.extend( $.fn.dataTable.defaults, {
		// Server side
//		serverSide: true,
//		processing: true,
		deferLoading: 100,

		// Interface
//		ordering: false,
//		searching: false,
		info: false,
		lengthChange: false,
		order: [], // no initial order or [0, 'desc']

		// Responsive
		responsive: {
			details: {
				type: 'column',
				target: 'td'
//				target: 'td:nth-child(n+2)'
			}
		},

		// https://datatables.net/reference/option/columns.responsivePriority
		columnDefs: [
			{ responsivePriority: 1, targets:  0 },
			{ responsivePriority: 2, targets:  1 },
			{ responsivePriority: 3, targets:  2 },
			{ responsivePriority: 6, targets:  3 },
			{ responsivePriority: 4, targets:  4 },
			{ responsivePriority: 5, targets:  5 },
			{ orderable: false, targets: 0 },
            { className: "all", targets: [ 0, 1 ] },
			{
				targets: [0],
				data: null,
				defaultContent: '<input type="checkbox" class="select-req">'
			}
		],
/*
		columns: [
			{ title: '<input type=\"checkbox\" class=\"select-all\">' },
			{ title: 'IP address'   },
			{ title: 'Country code' },
			{ title: 'AS number'    },
			{ title: 'Target'       },
			{ title: 'Elapsed[sec]' },
			{ title: 'Fails/Calls'  },
		],
		columns: [
		{ visible: true },
		{ visible: true },
			null,
			null,
			null,
			null,
			null
		],
		fixedColumns:   {
			leftColumns: 2
		},
*/
		// Pagenation
		pageLength: 10,
//		lengthMenu: [ 5, 10, 25, 50, 75, 100 ],
//		pagingType: 'simple_numbers',
		pagingType: 'full_numbers',

		// Language
		language: {
			url: '/wp-content/plugins/ip-geo-block/admin/datatables/i18n/' + lang
		}
	});

	$(function ($) {
	});
}(jQuery));