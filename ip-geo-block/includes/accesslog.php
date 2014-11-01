<?php
/**
 * Handling of access log
 * @todo implement sql
 */
define( 'IP_GEO_BLOCK_LOG_LEN', 100 );

function ip_geo_block_save_log( $hook, $validate ) {
	$file = IP_GEO_BLOCK_PATH . "database/log-${hook}.php";
	if ( $fp = @fopen( $file, "c+" ) ) {
		if ( @flock( $fp, LOCK_EX | LOCK_NB ) ) {
			$fstat = fstat( $fp );
			$lines = $fstat['size'] ?
				explode( "\n", fread( $fp, $fstat['size'] ) ) : array();

			// replace separator
			$uagent = str_replace( "\n", " ", $_SERVER['HTTP_USER_AGENT'] );
			$uagent = str_replace( ",",  "‚", trim( $uagent ) ); // &#044; --> &#130;
			$cookie = str_replace( "\n", " ", json_encode( $_COOKIE ) );
			$cookie = str_replace( ",",  "‚", trim( $cookie ) ); // &#044; --> &#130;

			array_shift( $lines );
			array_pop  ( $lines );
			array_unshift(
				$lines,
				sprintf( "%d,%s,%s,%s,%s,%s",
					time(),
					$validate['ip'],
					$validate['code'],
					basename( $_SERVER['REQUEST_URI'] ),
					$uagent, // should be sanitized on screen
					$cookie  // should be sanitized on screen
				)
			);
			$lines = array_slice( $lines, 0, IP_GEO_BLOCK_LOG_LEN );

			rewind( $fp );
			fwrite( $fp, "<?php/*\n" . implode( "\n", $lines ) . "\n*/?>" );
			ftruncate( $fp, ftell( $fp ) );
			@flock( $fp, LOCK_UN | LOCK_NB );
		}

		@fclose( $fp );
	}
}

function ip_geo_block_read_log( $hook = NULL ) {
	$list = $hook ? array( $hook ) : array( 'comment', 'login', 'admin' );
	$result = array();

	foreach ( $list as $hook ) {
		$lines = array();
		$file = IP_GEO_BLOCK_PATH . "database/log-${hook}.php";
		if ( $fp = @fopen( $file, 'r' ) ) {
			$fstat = fstat( $fp );
			$lines = $fstat['size'] ?
				explode( "\n", fread( $fp, $fstat['size'] ) ) : array();
			@fclose( $fp );
		}

		if ( ! empty( $lines ) ) {
			array_shift( $lines );
			array_pop  ( $lines );
			$result[ $hook ] = $lines;
		}
	}

	return $result;
}