<?php

namespace App\Services;

use chillerlan\QRCode\Common\EccLevel;
use chillerlan\QRCode\Output\QRGdImagePNG;
use chillerlan\QRCode\QRCode as QrGenerator;
use chillerlan\QRCode\QROptions;
use RuntimeException;

class QrCodeImageService
{
    /** Render a scan-safe PNG with the Mo Digital Events mark centered in the code. */
    public function render(string $value): string
    {
        $scale = 10;
        $options = new QROptions([
            'outputInterface' => QRGdImagePNG::class,
            'outputBase64' => false,
            'eccLevel' => EccLevel::H,
            'scale' => $scale,
            'quietzoneSize' => 4,
            'addLogoSpace' => true,
            'logoSpaceWidth' => 5,
            'logoSpaceHeight' => 5,
        ]);

        $png = (new QrGenerator($options))->render($value);
        $image = imagecreatefromstring($png);

        if ($image === false) {
            throw new RuntimeException('Unable to render QR code image.');
        }

        $centerX = intdiv(imagesx($image), 2);
        $centerY = intdiv(imagesy($image), 2);
        $white = imagecolorallocate($image, 255, 255, 255);
        $red = imagecolorallocate($image, 239, 68, 68);

        // The white surround keeps the brand mark separate from data modules.
        imagefilledellipse($image, $centerX, $centerY, 54, 54, $white);
        imagefilledellipse($image, $centerX, $centerY, 42, 42, $red);

        $label = 'MD';
        $font = 3;
        $textWidth = imagefontwidth($font) * strlen($label);
        $textHeight = imagefontheight($font);
        imagestring($image, $font, $centerX - intdiv($textWidth, 2), $centerY - intdiv($textHeight, 2), $label, $white);

        ob_start();
        imagepng($image, null, 9);
        $brandedPng = ob_get_clean();
        imagedestroy($image);

        if (! is_string($brandedPng)) {
            throw new RuntimeException('Unable to encode QR code image.');
        }

        return $brandedPng;
    }

    /** Keep guest punctuation while preventing a name from creating ZIP paths. */
    public function archiveName(string $value, string $fallback): string
    {
        $name = trim(preg_replace('/[\x00-\x1F\x7F]/u', '', $value) ?? '');
        $name = str_replace(['/', '\\'], ['／', '＼'], $name);

        return $name !== '' ? $name : $fallback;
    }
}
