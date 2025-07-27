dev instance="1":
    #!/usr/bin/env bash
    instance_num={{instance}}
    base_port=1420
    vite_port=$((base_port + (instance_num - 1) * 2))
    hmr_port=$((vite_port + 1))

    if [ $instance_num -eq 1 ]; then
        npm run tauri dev --workspace packages/app
    else
        identifier="chat.reverly.app.instance$instance_num"
        title="Revery (Instance $instance_num)"
        config_override="{\"build\":{\"devUrl\":\"http://localhost:$vite_port\"},\"identifier\":\"$identifier\",\"app\":{\"windows\":[{\"title\":\"$title\",\"width\":800,\"height\":600}]}}"
        VITE_PORT=$vite_port VITE_HMR_PORT=$hmr_port npm run tauri dev --workspace packages/app -- --config "$config_override"
    fi

build *args:
    npm run tauri build --workspace packages/app -- {{args}}
