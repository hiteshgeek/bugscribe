<?php

function asset_manifest($type = 'css')
{
      static $manifests = ['css' => null, 'js' => null];
      $manifestFile = $type === 'js'
            ? __DIR__ . '/../dist/rev/manifest-js.json'
            : __DIR__ . '/../dist/rev/manifest-css.json';
      if ($manifests[$type] === null) {
            if (!file_exists($manifestFile)) {
                  error_log("[asset_manifest] Manifest file not found: $manifestFile");
                  $manifests[$type] = [];
            } else {
                  $json = file_get_contents($manifestFile);
                  $manifests[$type] = json_decode($json, true) ?: [];
            }
      }

      return $manifests[$type];
}


function asset($logical, $variant = null)
{
      // Remove known prefixes (main., bugscribe.)
      // $logical = preg_replace('/^(main\.|bugscribe\.)/', '', $logical);
      $isJs = substr($logical, -3) === '.js';
      $isCss = substr($logical, -4) === '.css';
      $type = $isJs ? 'js' : ($isCss ? 'css' : null);
      if (!$type) {
            error_log("[asset] Unknown asset type for: $logical");
            return '/bugscribe/dist/' . $logical;
      }
      $manifestKey = $logical;
      // Support nomodule variant for JS (IIFE build)
      if ($type === 'js' && $variant === 'nomodule') {
            $manifestKey = preg_replace('/\.js$/', '.iife.js', $manifestKey);
      }
      $baseUrl = $type === 'js' ? '/bugscribe/dist/js/' : '/bugscribe/dist/css/';
      $manifest = asset_manifest($type);

      if (isset($manifest[$manifestKey])) {
            return $baseUrl . $manifest[$manifestKey];
      }
      error_log("[asset] Asset not found in manifest: $logical (key: $manifestKey)");
      return $baseUrl . $logical;
}
