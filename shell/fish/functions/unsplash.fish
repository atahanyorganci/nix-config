function unsplash -d "Download random images from Unsplash"
    argparse -n unsplash -X 1 h/help -- $argv; or return 1
    if test (count $argv) = 1
        set -f total $argv[1]
        set -f nums (seq 1 $total); or return 1
        echo -ne "Downloading images 0/$total from Unsplash..."
        for i in $nums
            echo -ne "\rDownloading images $i/$total from Unsplash..."
            set -l image "image$i.jpg"
            wget -q -O "$image" "https://source.unsplash.com/random/1920x1080"
        end
        echo -ne " DONE!\n"
    else
        set -f nums 1
        echo -ne "Downloading random image from Unsplash..."
        wget -q -O image.jpg "https://source.unsplash.com/random/1920x1080"
        echo " DONE!"
    end
end
