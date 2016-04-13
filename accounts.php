<?php
$regenerate = true;
try {
	$file = new SplFileObject('accounts.json');
	$maxAge = time() - (30 * 60);
	if($file->getMTime() >= $maxAge) {
		$feed = '';
		while (!$file->eof()) {
		    $accounts_json .= $file->fgets();
		}
    	$regenerate = false;
	}
} catch(Exception $e) {
}

if($regenerate) {
    include('simple_html_dom.php');
    include('jsonprettyencode.php');
    
    $accounts = [];
    
    $pagination = 0;
    $charactersFound = true;

    $page = file_get_html('http://ssf.poeladder.com/accounts');
    
    $account_rows = $page->find('a[href^="https"]');
    
    foreach($account_rows as $index => $account_row) {
        $account_parsed = [
            'name' => $account_row->plaintext,
            'account_url' => $account_row->href
        ];
        
        array_push($accounts, $account_parsed);
    }
    
    $accounts_json = pretty_json(json_encode($accounts));
    
	try {
		$file = new SplFileObject('accounts.json', 'w');
		$file->fwrite($accounts_json);
	} catch(Exception $e) {
		echo $e->getMessage();
	}
}

header('Content-Type: application/json; charset=UTF-8');
echo $accounts_json;

?>