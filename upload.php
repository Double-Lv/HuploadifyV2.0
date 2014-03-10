<?php
$filename = iconv('UTF-8', 'GBK', $_POST['file']);

if ($filename) {
    file_put_contents('uploads/'.$filename,file_get_contents($_FILES["file"]["tmp_name"]),FILE_APPEND);
}

echo $filename;
?>