/**
 * Creating Application Module
 *
 */
var app = angular.module('WPApp', [
	'ngSanitize', // ng-bind-html
	'ngCookies',  // $cookies
	'ngAnimate',  // animate-show-hide
	'language',
	'geolocation',
	'validate-wp',
	'postproxy'
]);

/**
 * Configuration for runtime objects
 *
 */
app.config(['$httpProvider', function ($httpProvider) {
	$httpProvider.defaults.timeout = 10000;
}])
.run(function () {
	console.log('run');
});

/**
 * Exception Handler
 *
 */
app.factory('$exceptionHandler', ['$window', function ($window) {
	return function (exception, cause) {
		console.log(exception.message);
	};
}]);

/**
 * Controller (too heavy!!)
 *
 * https://www.airpair.com/angularjs/posts/top-10-mistakes-angularjs-developers-make
 * http://stackoverflow.com/questions/23382109/how-to-avoid-a-large-number-of-dependencies-in-angularjs
 */
angular.module('WPApp').controller('WPAppCtrl', ['$scope', '$cookies', 'LanguageSvc', 'GeolocationSvc', 'WPValidateSvc', 'PostProxySvc', function ($scope, $cookies, svcLang, svcGeoloc, svcWP, svcProxy) {
	// Language
	$scope.lang = svcLang();

	// Message
	var messageOut = function (title, msg) {
		$scope.message += title + ': ' + msg + "\n";
	};
	var messageClear = function () {
		$scope.message = '';
	};
	messageClear();

	// Post Comment
	$scope.form = {
		comment: {
			author: 'spam-master',
			email: 'spam@example.com',
			url: 'http://example.com/',
			comment: 'This is a spam comment.'
		},
		trackback: {
			title: 'About spam',
			excerpt: 'This is a trackback spam.',
			url: 'http://example.com/',
			blog_name: 'Spammer\'s'
		},
		login: {
			log: 'admin',
			pwd: '0123abcd'
		},
		admin: {
			cookie: 'wordpress_test_cookie=WP+Cookie+check'
		},
		ajax: {
			action: 'myAction'
		},
		pingback: {
			xml: 
"<?xml version='1.0' encoding='utf-8'?>\n" +
"<methodcall>\n" +
"    <methodname>\n" +
"        pingback.ping\n" +
"    </methodname>\n" +
"    <params>\n" +
"        <param>\n" +
"            <value>\n" +
"                <string>\n" +
"                    http://example.com/\n" +
"                </string>\n" +
"            </value>\n" +
"        </param>\n" +
"        <param>\n" +
"            <value>\n" +
"                <string>\n" +
"                    %WP_HOME%\n" +
"                </string>\n" +
"            </value>\n" +
"        </param>\n" +
"    </params>\n" +
"</methodcall>"
		},
		xmlrpc: {
			xml:
"<?xml version='1.0' encoding='utf-8'?>\n" +
"<methodcall>\n" +
"    <methodname>\n" +
"        wp.getUsers\n" +
"    </methodname>\n" +
"    <params>\n" +
"        <param>\n" +
"            <value>\n" +
"                <string>\n" +
"                    %USER_NAME%\n" +
"                </string>\n" +
"            </value>\n" +
"        </param>\n" +
"        <param>\n" +
"            <value>\n" +
"                <string>\n" +
"                    %PASSWORD%\n" +
"                </string>\n" +
"            </value>\n" +
"        </param>\n" +
"        <param>\n" +
"            <value>\n" +
"                <string>\n" +
"                    \n" +
"                </string>\n" +
"            </value>\n" +
"        </param>\n" +
"    </params>\n" +
"</methodcall>"
		},
		xmlrpc_demo: {
			xml:
"<?xml version='1.0' encoding='utf-8'?>\n" +
"<methodcall>\n" +
"    <methodname>\n" +
"        demo.sayHello\n" +
"    </methodname>\n" +
"</methodcall>"
		}
	};

	// Checkbox and Toggle
	$scope.checkbox = {
		post_items: true,
		comment: true,
		trackback: true,
		login: true,
		admin_area: true,
		admin_ajax: true,
		pingback: true,
		xmlrpc: true,
		xmlrpc_demo: true
	};
	$scope.selectAll = function () {
		for (var item in $scope.checkbox) {
			if ($scope.checkbox.hasOwnProperty(item)) {
				$scope.checkbox[item] = $scope.checkbox.post_items;
			}
		}
	};
	$scope.show = {};
	$scope.toggle = function (item) {
		$scope.show[item] = !$scope.show[item];
	};

	// Home URL
	var url = $cookies['home-url'];
	if (!url) {
		url = parse_uri(location.href);
		url = url['scheme'] + '://' + url['authority'] + '/';
	}
	$scope.home_url = url;

	// Single Page
	url = $cookies['single-page'];
	if (!url) {
		url = trailingslashit($scope.home_url) + '?p=0';
	}
	$scope.single_page = url;

	/**
	 * Check WordPress pages
	 *
	 */
	$scope.validate_home = function () {
		return svcWP.validate_home($scope.home_url).then(function (res) {
			$cookies['home-url'] = $scope.home_url;
			messageOut('WordPress Home', res.stat);
		});
	};
	$scope.validate_page = function (echo) {
		return svcWP.validate_page($scope.single_page).then(function (res) {
			$scope.single_page = res.url;
			$cookies['single-page'] = res.url;
			$scope.comment_post_id = res.id;
			$scope.comment_post_id = 0;
			if (echo) {
				messageOut('Single Page', res.stat);
			}
		});
	};

	/**
	 * Generate random IP address and check the country
	 *
	 */
	$scope.generate_ip = function () {
		$scope.ip_address = get_random_ip();
		svcGeoloc.generate_ip($scope.ip_address).then(function (ip) {
			$scope.ip_address = ip;
		});
	};
	$scope.generate_ip();

	/**
	 * Post a comment to the target page
	 *
	 */
	var post_comment = function (url, proxy) {
		svcProxy.post_form(url, $scope.form.comment, proxy).then(function (res) {
			messageOut('Comment', res.stat);
		});
	};

	/**
	 * Post a trackback message
	 *
	 */
	var post_trackback = function (url, proxy) {
		// Normalize trackback url
		var trackback = parse_uri($scope.form.trackback.url);
		trackback = trackback['scheme'] + '://' + trackback['authority'] + '/'

		// Every time trackback url should be changed
		$scope.form.trackback.url = trackback + '#' + get_random_int(1000, 9999);

		svcProxy.post_form(url, $scope.form.trackback, proxy).then(function (res) {
			messageOut('Trackback', res.stat);
		});
	}

	/**
	 * Access to login form
	 *
	 */
	var post_login = function (url, proxy) {
		svcProxy.post_form(url, $scope.form.login, proxy).then(function (res) {
			messageOut('Login Form', res.stat);
		});
	};

	/**
	 * Access to admin area
	 *
	 */
	var post_admin = function (url, proxy) {
		svcProxy.post_form(url, $scope.form.admin, proxy).then(function (res) {
			messageOut('Admin Area', res.stat);
		});
	};

	/**
	 * Access to admin ajax
	 *
	 */
	var post_admin_ajax = function (url, proxy) {
		svcProxy.post_form(url, $scope.form.ajax, proxy).then(function (res) {
			messageOut('Admin Ajax', res.stat);
		});
	};

	/**
	 * Post a pingback to XML-RPC server
	 *
	 */
	var post_pingback = function (url, page, proxy) {
		var xml = $scope.form.pingback.xml;
		xml = xml.replace(/%WP_HOME%/, page);
		svcProxy.post_xml(url, xml, proxy).then(function (res) {
			messageOut('Pingback', res.stat);
		});
	};

	/**
	 * Post a remote command to XML-RPC server
	 *
	 */
	var post_xmlrpc = function (url, proxy) {
		var xml = $scope.form.xmlrpc.xml;
		xml = xml.replace(/%USER_NAME%/, $scope.form.admin.log);
		xml = xml.replace(/%PASSWORD%/, $scope.form.admin.pwd);
		svcProxy.post_xml(url, xml, proxy).then(function (res) {
			messageOut('XML-RPC', res.stat); 
		});
	};

	/**
	 * Post a remote command to XML-RPC server
	 *
	 */
	var post_xmlrpc_demo = function (url, proxy) {
		var xml = $scope.form.xmlrpc_demo.xml;
		svcProxy.post_xml(url, xml, proxy).then(function (res) {
			messageOut('XML-RPC demo', res.stat);
		});
	};

	/**
	 * Submit
	 *
	 */
	$scope.submit = function () {
		var home = trailingslashit($scope.home_url);
		var page = trailingslashit($scope.single_page);
		var proxy = retrieve_ip($scope.ip_address);

		// Post Comment
		if ($scope.checkbox.comment) {
			$scope.validate_page(false).then(function (res) {
				post_comment(home + 'wp-comments-post.php', proxy);
			});
		}

		// Trackback
		if ($scope.checkbox.trackback) {
			$scope.validate_page(false).then(function (res) {
				post_trackback(page + 'trackback/', proxy);
			});
		}

		// Login Form
		if ($scope.checkbox.login)
			post_login(home + 'wp-login.php', proxy);

		// Admin Area
		if ($scope.checkbox.admin_area)
			post_admin(home + 'wp-admin/', proxy);

		// Admin Ajax
		if ($scope.checkbox.admin_ajax)
			post_admin_ajax(home + 'wp-admin/admin-ajax.php', proxy);

		// Pingback
		if ($scope.checkbox.pingback)
			post_pingback(home + 'xmlrpc.php', page, proxy);

		// XML-RPC
		if ($scope.checkbox.xmlrpc)
			post_xmlrpc(home + 'xmlrpc.php', proxy);

		// XML-RPC Demo
		if ($scope.checkbox.xmlrpc_demo)
			post_xmlrpc_demo(home + 'xmlrpc.php', proxy);
	};

	$scope.reset = function () {
		messageClear();
	};
}]);