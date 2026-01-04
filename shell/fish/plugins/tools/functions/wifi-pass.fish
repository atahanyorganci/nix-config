function wifi-pass -d "Show wifi password"
    switch (uname -o)
        case Darwin
            set -l wifi /System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport
            set -l ssid (command $wifi -I | grep -E ' SSID:' | cut -d ":" -f 2 | cut -b 2-)
            if test -z $ssid
                echo "Not connected."
                return 1
            end
            set -l auth (command $wifi -I | grep 'link auth:' | cut -d ":" -f 2 | cut -b 2-)
            switch auth
                case '*wpa*'
                    set -l type WPA
                case '*none*'
                    set -l type nopass
                case '*wep*'
                    set -l type WEP
            end
            set -l password (security find-generic-password -ga $ssid 2>&1 | grep "password:" | cut -d '"' -f 2)
            if test $status != 0
                echo "Password not found"
                return 1
            end
            set -l link "WIFI:S:$ssid;T:$type;P:$password;;"
            echo "SSID: $ssid"
            echo "Security: $auth"
            echo "Password: $password"
            qrencode -t ASCII -s 1 -l L $link
        case '*Linux*'
            nmcli device wifi show-password
    end
end
