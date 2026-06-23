<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Beem SMS (https://apisms.beem.africa)
    |--------------------------------------------------------------------------
    */
    'beem_api_key'    => env('BEEM_API_KEY'),
    'beem_secret_key' => env('BEEM_SECRET_KEY'),
    'beem_sender_id'  => env('BEEM_SENDER_ID', 'MoDigital'),

    /*
    |--------------------------------------------------------------------------
    | WhatsApp (Beem) — credentials provided; API docs pending
    |--------------------------------------------------------------------------
    */
    'whatsapp_api_key'    => env('WHATSAPP_API_KEY'),
    'whatsapp_secret_key' => env('WHATSAPP_SECRET_KEY'),
];
