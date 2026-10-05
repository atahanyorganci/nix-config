{config, ...}: let
  infra = config.flake.infra;
in {
  flake.modules.nixos.otel-collector = {
    lib,
    config,
    pkgs,
    ...
  }: let
    cfg = config.otel-collector;

    # StateDirectory of the upstream unit: the journald receivers keep their
    # read cursors here, so a restart neither drops nor repeats records.
    stateDir = "/var/lib/opentelemetry-collector";

    serviceOf = unit: lib.removeSuffix ".service" unit;
    probing = cfg.httpcheck.targets != [];

    # journald PRIORITY (a string) to OpenTelemetry severity: the syslog mapping
    # of the logs data model, with the levels Axiom reads.
    severities = [
      {
        priorities = ["0" "1" "2"];
        number = "SEVERITY_NUMBER_FATAL";
        text = "FATAL";
      }
      {
        priorities = ["3"];
        number = "SEVERITY_NUMBER_ERROR";
        text = "ERROR";
      }
      {
        priorities = ["4"];
        number = "SEVERITY_NUMBER_WARN";
        text = "WARN";
      }
      {
        priorities = ["5" "6"];
        number = "SEVERITY_NUMBER_INFO";
        text = "INFO";
      }
      {
        priorities = ["7"];
        number = "SEVERITY_NUMBER_DEBUG";
        text = "DEBUG";
      }
    ];
    priorityIs = priorities: lib.concatMapStringsSep " or " (p: ''log.body["PRIORITY"] == "${p}"'') priorities;

    # One receiver and pipeline per unit, so each record's `service.name` is set
    # on a batch that holds that unit alone.
    journald = lib.listToAttrs (map (unit: {
        name = serviceOf unit;
        value = unit;
      })
      cfg.journald.units);
  in {
    options.otel-collector = {
      enable = lib.mkEnableOption ''
        an OpenTelemetry Collector shipping this host's telemetry to the Axiom
        dataset `infra.axiom.dataset`. It needs `axiom.endpoint` and
        `axiom.ingest-token` in the host's nix-secrets file (`just connect-axiom
        <host>`) before it is enabled: sops-nix fails activation on a missing key
      '';

      journald.units = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [];
        example = ["agent-gateway.service"];
        description = ''
          systemd units whose journal is shipped as logs, `service.name` the
          unit's name. Lines that are JSON objects are dropped: they are a
          service's structured log, which it exports over OTLP itself. What is
          left is what only the journal has: systemd's own lines about the unit
          (start, exit, restart), health checks, crashes.
        '';
      };

      httpcheck.targets = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [];
        example = ["http://127.0.0.1:3000/v1/models"];
        description = ''
          URLs requested every minute with the `User-Agent` `otelcol-httpcheck`.
          The probe's own result is discarded: the target's telemetry records
          each request (the agent gateway's access log does; it does not trace
          `/v1/models`), so a stretch without a successful one means the
          target, this collector or the host is down, whether or not anyone
          used the target.
        '';
      };

      memoryLimitMiB = lib.mkOption {
        type = lib.types.ints.positive;
        default = 128;
        description = "Memory above which the collector refuses data rather than grow (`memory_limiter`).";
      };
    };

    config = lib.mkIf cfg.enable {
      # hosts/<host>.yaml in nix-secrets; `just connect-axiom <host>` writes both.
      sops.secrets."axiom/endpoint" = {};
      sops.secrets."axiom/ingest-token" = {};
      # Read by PID 1 for EnvironmentFile before it drops to the dynamic user, so
      # it stays root's alone.
      sops.templates."otel-collector.env" = {
        content = ''
          AXIOM_ENDPOINT=${config.sops.placeholder."axiom/endpoint"}
          AXIOM_INGEST_TOKEN=${config.sops.placeholder."axiom/ingest-token"}
        '';
        restartUnits = ["opentelemetry-collector.service"];
      };

      services.opentelemetry-collector = {
        enable = true;
        # contrib: the journald and httpcheck receivers, and the filter,
        # transform and resource processors.
        package = pkgs.opentelemetry-collector-contrib;
        # The endpoint comes from the environment, which the build-time
        # `otelcol validate` does not have.
        validateConfigOverrides = ["exporters::otlp_http::endpoint=https://validate.invalid"];

        settings = {
          extensions.file_storage = {
            directory = stateDir;
            # The unit's StateDirectory makes it; this is for the build-time
            # `otelcol validate`, which checks it exists and runs where it does not.
            create_directory = true;
          };

          receivers =
            {
              otlp.protocols.http.endpoint = "127.0.0.1:4318";
            }
            // lib.mapAttrs' (name: unit:
              lib.nameValuePair "journald/${name}" {
                units = [unit];
                priority = "info";
                storage = "file_storage";
                convert_message_bytes = true;
              })
            journald
            // lib.optionalAttrs probing {
              http_check = {
                collection_interval = "60s";
                targets =
                  map (endpoint: {
                    inherit endpoint;
                    method = "GET";
                    headers."User-Agent" = "otelcol-httpcheck";
                  })
                  cfg.httpcheck.targets;
              };
            };

          processors =
            {
              memory_limiter = {
                check_interval = "1s";
                limit_mib = cfg.memoryLimitMiB;
                spike_limit_mib = cfg.memoryLimitMiB / 4;
              };
              batch = {};
              resource_detection = {
                detectors = ["system"];
                system.hostname_sources = ["os"];
                override = false;
              };

              # Effect's tracer records every request header as an attribute, and
              # Axiom gives each header its own field, against a limit of 256 a
              # dataset. NetBird's identity headers are kept, under shorter names.
              "transform/spans" = {
                error_mode = "ignore";
                trace_statements = [
                  ''set(span.attributes["netbird.user_id"], span.attributes["http.request.header.x-netbird-user-id"]) where span.attributes["http.request.header.x-netbird-user-id"] != nil''
                  ''set(span.attributes["netbird.groups"], span.attributes["http.request.header.x-netbird-groups"]) where span.attributes["http.request.header.x-netbird-groups"] != nil''
                  ''delete_matching_keys(span.attributes, "^http[.](request|response)[.]header[.]")''
                ];
              };

              # Effect's OpenTelemetry logger puts the span context in attributes,
              # not on the record, so nothing links a log line to its trace.
              "transform/logs" = {
                error_mode = "ignore";
                log_statements = [
                  ''set(log.trace_id.string, log.attributes["traceId"]) where log.attributes["traceId"] != nil''
                  ''set(log.span_id.string, log.attributes["spanId"]) where log.attributes["spanId"] != nil''
                  ''delete_key(log.attributes, "traceId")''
                  ''delete_key(log.attributes, "spanId")''
                  ''delete_key(log.attributes, "fiberId")''
                ];
              };

              "filter/journald-json" = {
                error_mode = "ignore";
                log_conditions = [''IsMap(log.body) and IsMatch(log.body["MESSAGE"], "^[{]")''];
              };

              # The receiver puts the whole journal entry, some forty fields, in
              # the body. Keep the message and a few fields; Axiom would make each
              # of the rest a field.
              "transform/journald" = {
                error_mode = "ignore";
                log_statements =
                  [
                    ''set(log.attributes["log.source"], "journald")''
                    ''set(log.attributes["journald.unit"], log.body["UNIT"]) where log.body["UNIT"] != nil''
                    ''set(log.attributes["journald.systemd_unit"], log.body["_SYSTEMD_UNIT"]) where log.body["_SYSTEMD_UNIT"] != nil''
                    ''set(log.attributes["syslog.identifier"], log.body["SYSLOG_IDENTIFIER"]) where log.body["SYSLOG_IDENTIFIER"] != nil''
                  ]
                  ++ lib.concatMap (severity: [
                    "set(log.severity_number, ${severity.number}) where ${priorityIs severity.priorities}"
                    ''set(log.severity_text, "${severity.text}") where ${priorityIs severity.priorities}''
                  ])
                  severities
                  ++ [''set(log.body, log.body["MESSAGE"])''];
              };
            }
            // lib.mapAttrs' (name: _:
              lib.nameValuePair "resource/${name}" {
                attributes = [
                  {
                    key = "service.name";
                    value = name;
                    action = "upsert";
                  }
                ];
              })
            journald;

          exporters =
            {
              otlp_http = {
                endpoint = "\${env:AXIOM_ENDPOINT}";
                compression = "zstd";
                headers = {
                  Authorization = "Bearer \${env:AXIOM_INGEST_TOKEN}";
                  X-Axiom-Dataset = infra.axiom.dataset;
                };
              };
            }
            // lib.optionalAttrs probing {
              # The probe matters for the request it makes, not for what it measures.
              nop = {};
            };

          service = {
            extensions = ["file_storage"];
            # No metrics listener on :8888.
            telemetry.metrics.level = "none";
            pipelines =
              {
                traces = {
                  receivers = ["otlp"];
                  processors = ["memory_limiter" "resource_detection" "transform/spans" "batch"];
                  exporters = ["otlp_http"];
                };
                "logs/app" = {
                  receivers = ["otlp"];
                  processors = ["memory_limiter" "resource_detection" "transform/logs" "batch"];
                  exporters = ["otlp_http"];
                };
              }
              // lib.mapAttrs' (name: _:
                lib.nameValuePair "logs/journald-${name}" {
                  receivers = ["journald/${name}"];
                  processors = ["memory_limiter" "filter/journald-json" "transform/journald" "resource/${name}" "resource_detection" "batch"];
                  exporters = ["otlp_http"];
                })
              journald
              // lib.optionalAttrs probing {
                "metrics/probe" = {
                  receivers = ["http_check"];
                  exporters = ["nop"];
                };
              };
          };
        };
      };

      systemd.services.opentelemetry-collector = {
        # The journald receiver runs journalctl.
        path = [config.systemd.package];
        serviceConfig.EnvironmentFile = config.sops.templates."otel-collector.env".path;
      };
    };
  };
}
