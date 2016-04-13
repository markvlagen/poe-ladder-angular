<?php
$regenerate = true;
try {
	$file = new SplFileObject('characters.json');
	$maxAge = time() - (30 * 60);
	if($file->getMTime() >= $maxAge) {
		$feed = '';
		while (!$file->eof()) {
		    $characters_json .= $file->fgets();
		}
    	$regenerate = false;
	}
} catch(Exception $e) {
}

if($regenerate) {
    include('simple_html_dom.php');
    include('jsonprettyencode.php');
    
    $characters = [];
    
    $pagination = 0;
    $charactersFound = true;
    while($charactersFound) {
        $page = file_get_html('http://ssf.poeladder.com/?index=' . $pagination);
        
        $character_rows = $page->find('tr');
        
        if(count($character_rows) > 1) {
            foreach($character_rows as $index => $character_row) {
                if($index === 0) {
                    continue;
                }
                
                $character_parsed = [];
                
                foreach($character_row->find('td') as $property_index => $property_value) {
                    switch($property_index) {
                        case 0:
                            $character_parsed['rank'] = intval($property_value->plaintext);
                        break;
                        case 1:
                            $character_parsed['name'] = $property_value->find('a', 0)->plaintext;
                            $character_parsed['account_url'] = $property_value->find('a', 0)->href;
                        break;
                        case 2:
                            $character_parsed['class'] = $property_value->plaintext;
                        break;
                        case 3:
                            $character_parsed['level'] = intval($property_value->plaintext);
                        break;
                        case 4:
                            $character_parsed['experience'] = intval($property_value->plaintext);
                        break;
                        case 5:
                            if(count($property_value->find('img')) == 1) {
                                $character_parsed['status'] = $property_value->find('img', 0)->alt;
                            } else {
                                $character_parsed['status'] = $property_value->plaintext;
                            }
                        break;
                        case 6:
                            $character_parsed['experience_last_hour'] = intval($property_value->plaintext);
                        break;
                    }
                }
                
                array_push($characters, $character_parsed);
            }
        } else {
            $charactersFound = false;
        }
        $pagination++;
    }
    
    $characters_json = pretty_json(json_encode($characters));
    
	try {
		$file = new SplFileObject('characters.json', 'w');
		$file->fwrite($characters_json);
	} catch(Exception $e) {
		echo $e->getMessage();
	}
}

header('Content-Type: application/json; charset=UTF-8');
echo $characters_json;

?>