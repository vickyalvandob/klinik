<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;

Schedule::call(fn () => Cache::put('clinic-scheduler-heartbeat', now()->timestamp, now()->addMinutes(10)))
    ->everyMinute()->name('clinic-scheduler-heartbeat');
Schedule::command('clinic:backup --prune')->dailyAt('01:00')->timezone('Asia/Jakarta')
    ->withoutOverlapping(60)->environments(['production']);

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
