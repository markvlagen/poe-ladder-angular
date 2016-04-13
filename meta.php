<?php
$regenerate = true;
try {
	$file = new SplFileObject('meta.json');
	$maxAge = time() - (30 * 60);
	if($file->getMTime() >= $maxAge) {
		$feed = '';
		while (!$file->eof()) {
		    $meta_json .= $file->fgets();
		}
    	$regenerate = false;
	}
} catch(Exception $e) {
}

if($regenerate) {
    include('simple_html_dom.php');
    include('jsonprettyencode.php');
    
    $page = file_get_html('http://ssf.poeladder.com/');
    
    $plaintext = $page->plaintext;
    
    $ladder_update_regex = "/Last Ladder Update:(.*?)<\\/br>/"; 
    $status_regex = "/Status:(.*?)<\\/br>/";
    $process_time_regex = "/Last Process Time:(\\d*?) Seconds<\\/br>/"; 
     
    preg_match($ladder_update_regex, $plaintext, $ladder_update);
    preg_match($status_regex, $plaintext, $status);
    preg_match($process_time_regex, $plaintext, $process_time);
    
    $meta = [
        'last_ladder_update' => strtotime($ladder_update[1]),
        'status' => $status[1],
        'last_process_time' => intval($process_time[1])
    ];
    
    $meta_json = pretty_json(json_encode($meta));
    
	try {
		$file = new SplFileObject('meta.json', 'w');
		$file->fwrite($meta_json);
	} catch(Exception $e) {
		echo $e->getMessage();
	}
}

header('Content-Type: application/json; charset=UTF-8');
echo $meta_json;

?>