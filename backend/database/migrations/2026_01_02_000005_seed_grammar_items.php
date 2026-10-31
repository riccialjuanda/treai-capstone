<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Mengisi bank soal Grammar Practice (3 level x 3 tipe soal).
 * Hanya berjalan bila tabel grammar_items masih kosong.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('grammar_items') || DB::table('grammar_items')->count() > 0) {
            return;
        }

        $now = now();
        $rows = [];

        foreach ($this->items() as $item) {
            $rows[] = [
                'level' => $item['level'],
                'type' => $item['type'],
                'focus' => $item['focus'],
                'prompt' => $item['prompt'],
                'sentence' => $item['sentence'] ?? null,
                'options' => isset($item['options']) ? json_encode($item['options'], JSON_UNESCAPED_UNICODE) : null,
                'answer' => $item['answer'],
                'explanation' => $item['explanation'] ?? null,
                'created_at' => $now,
            ];
        }

        DB::table('grammar_items')->insert($rows);
    }

    public function down(): void
    {
        if (Schema::hasTable('grammar_items')) {
            DB::table('grammar_items')->truncate();
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function items(): array
    {
        return array_merge(
            $this->beginnerItems(),
            $this->preIntermediateItems(),
            $this->intermediateItems()
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function beginnerItems(): array
    {
        return [
            [
                'level' => 'beginner',
                'type' => 'multiple_choice',
                'focus' => 'Simple Present Tense',
                'prompt' => 'She ___ to school every morning.',
                'options' => ['go', 'goes', 'going', 'gone'],
                'answer' => 'goes',
                'explanation' => 'Subjek orang ketiga tunggal (she, he, it) memakai kata kerja dasar + s/es pada simple present.',
            ],
            [
                'level' => 'beginner',
                'type' => 'multiple_choice',
                'focus' => 'There is / There are',
                'prompt' => 'There ___ two books on the table.',
                'options' => ['is', 'are', 'am', 'be'],
                'answer' => 'are',
                'explanation' => 'Kata benda jamak (two books) memakai "there are". Gunakan "there is" hanya untuk tunggal.',
            ],
            [
                'level' => 'beginner',
                'type' => 'multiple_choice',
                'focus' => 'Simple Present Tense',
                'prompt' => 'I ___ coffee every morning.',
                'options' => ['drink', 'drinks', 'drinking', 'drank'],
                'answer' => 'drink',
                'explanation' => 'Subjek "I" memakai kata kerja dasar tanpa tambahan s.',
            ],
            [
                'level' => 'beginner',
                'type' => 'multiple_choice',
                'focus' => 'To Be',
                'prompt' => 'My brother ___ tall.',
                'options' => ['is', 'are', 'am', 'be'],
                'answer' => 'is',
                'explanation' => 'Subjek tunggal orang ketiga (my brother) memakai "is".',
            ],
            [
                'level' => 'beginner',
                'type' => 'multiple_choice',
                'focus' => 'Simple Past Tense',
                'prompt' => 'They ___ football yesterday.',
                'options' => ['play', 'plays', 'played', 'playing'],
                'answer' => 'played',
                'explanation' => 'Keterangan waktu "yesterday" menandakan simple past, sehingga kata kerja menjadi bentuk lampau (played).',
            ],
            [
                'level' => 'beginner',
                'type' => 'true_false',
                'focus' => 'Auxiliary Do / Does',
                'prompt' => 'Kalimat "He don\'t like tea" sudah benar secara tata bahasa.',
                'options' => ['Benar', 'Salah'],
                'answer' => 'Salah',
                'explanation' => 'Subjek "he" memerlukan "does not" atau disingkat "doesn\'t", bukan "don\'t".',
            ],
            [
                'level' => 'beginner',
                'type' => 'true_false',
                'focus' => 'Articles a / an',
                'prompt' => 'Artikel "an" dipakai sebelum kata yang diawali bunyi vokal, misalnya "an apple".',
                'options' => ['Benar', 'Salah'],
                'answer' => 'Benar',
                'explanation' => '"An" dipakai di depan bunyi vokal (a, e, i, o, u), sedangkan "a" untuk bunyi konsonan.',
            ],
            [
                'level' => 'beginner',
                'type' => 'true_false',
                'focus' => 'Irregular Verbs',
                'prompt' => 'Bentuk lampau (past) dari kata kerja "go" adalah "goed".',
                'options' => ['Benar', 'Salah'],
                'answer' => 'Salah',
                'explanation' => '"Go" adalah kata kerja tidak beraturan. Bentuk lampaunya adalah "went".',
            ],
            [
                'level' => 'beginner',
                'type' => 'true_false',
                'focus' => 'To Be',
                'prompt' => 'Subjek "I" selalu diikuti "am" pada kalimat yang memakai "to be".',
                'options' => ['Benar', 'Salah'],
                'answer' => 'Benar',
                'explanation' => 'Polanya: I am, you are, he/she/it is, we/they are.',
            ],
            [
                'level' => 'beginner',
                'type' => 'sentence_arrange',
                'focus' => 'Present Continuous',
                'prompt' => 'Susun kata berikut menjadi kalimat yang benar.',
                'sentence' => 'She is reading a book.',
                'answer' => 'She is reading a book.',
                'explanation' => 'Present continuous: subjek + to be (is) + kata kerja -ing.',
            ],
            [
                'level' => 'beginner',
                'type' => 'sentence_arrange',
                'focus' => 'Present Continuous',
                'prompt' => 'Susun kata berikut menjadi kalimat yang benar.',
                'sentence' => 'They are playing in the park.',
                'answer' => 'They are playing in the park.',
                'explanation' => 'Subjek jamak "they" memakai "are" + kata kerja -ing.',
            ],
            [
                'level' => 'beginner',
                'type' => 'sentence_arrange',
                'focus' => 'Have / Has',
                'prompt' => 'Susun kata berikut menjadi kalimat yang benar.',
                'sentence' => 'I have two younger sisters.',
                'answer' => 'I have two younger sisters.',
                'explanation' => 'Subjek "I" memakai "have" untuk menyatakan kepemilikan.',
            ],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function preIntermediateItems(): array
    {
        return [
            [
                'level' => 'pre_intermediate',
                'type' => 'multiple_choice',
                'focus' => 'Conditional Type 1',
                'prompt' => 'If it ___ tomorrow, we will cancel the trip.',
                'options' => ['rains', 'rained', 'raining', 'rain'],
                'answer' => 'rains',
                'explanation' => 'Conditional tipe 1 memakai simple present pada klausa "if" dan "will" pada klausa utama.',
            ],
            [
                'level' => 'pre_intermediate',
                'type' => 'multiple_choice',
                'focus' => 'Present Perfect',
                'prompt' => 'I have lived here ___ 2019.',
                'options' => ['for', 'since', 'during', 'from'],
                'answer' => 'since',
                'explanation' => '"Since" dipakai untuk titik waktu tertentu (2019), sedangkan "for" untuk durasi (for five years).',
            ],
            [
                'level' => 'pre_intermediate',
                'type' => 'multiple_choice',
                'focus' => 'Relative Clause',
                'prompt' => 'She is the girl ___ won the competition.',
                'options' => ['who', 'which', 'whose', 'whom'],
                'answer' => 'who',
                'explanation' => '"Who" dipakai untuk merujuk orang dan berperan sebagai subjek pada klausa relatif.',
            ],
            [
                'level' => 'pre_intermediate',
                'type' => 'multiple_choice',
                'focus' => 'Past Perfect',
                'prompt' => 'By the time we arrived, the film ___.',
                'options' => ['already started', 'had already started', 'has already started', 'was already starting'],
                'answer' => 'had already started',
                'explanation' => 'Past perfect dipakai untuk kejadian yang selesai lebih dahulu dibanding kejadian lain di masa lalu.',
            ],
            [
                'level' => 'pre_intermediate',
                'type' => 'multiple_choice',
                'focus' => 'Adjective + Preposition',
                'prompt' => 'He is interested ___ learning Japanese.',
                'options' => ['on', 'in', 'at', 'for'],
                'answer' => 'in',
                'explanation' => 'Pasangan tetapnya adalah "interested in".',
            ],
            [
                'level' => 'pre_intermediate',
                'type' => 'true_false',
                'focus' => 'Used To',
                'prompt' => '"Used to" dipakai untuk menyatakan kebiasaan masa lalu yang sekarang sudah tidak dilakukan lagi.',
                'options' => ['Benar', 'Salah'],
                'answer' => 'Benar',
                'explanation' => 'Contoh: "I used to swim every Sunday" berarti dahulu rutin, sekarang tidak lagi.',
            ],
            [
                'level' => 'pre_intermediate',
                'type' => 'true_false',
                'focus' => 'Common Errors',
                'prompt' => 'Kalimat "I am agree with you" sudah benar secara tata bahasa.',
                'options' => ['Benar', 'Salah'],
                'answer' => 'Salah',
                'explanation' => '"Agree" adalah kata kerja, bukan kata sifat, sehingga bentuk benarnya adalah "I agree with you".',
            ],
            [
                'level' => 'pre_intermediate',
                'type' => 'true_false',
                'focus' => 'Present Perfect',
                'prompt' => 'Kalimat "I have seen him yesterday" benar karena present perfect bisa dipakai bersama keterangan waktu lampau yang spesifik.',
                'options' => ['Benar', 'Salah'],
                'answer' => 'Salah',
                'explanation' => 'Present perfect tidak dipakai bersama keterangan waktu lampau yang spesifik. Bentuk benarnya "I saw him yesterday".',
            ],
            [
                'level' => 'pre_intermediate',
                'type' => 'true_false',
                'focus' => 'Uncountable Noun',
                'prompt' => 'Kata "information" tidak memiliki bentuk jamak "informations".',
                'options' => ['Benar', 'Salah'],
                'answer' => 'Benar',
                'explanation' => '"Information" adalah kata benda tak terhitung. Untuk menyatakan jumlah gunakan "a piece of information".',
            ],
            [
                'level' => 'pre_intermediate',
                'type' => 'sentence_arrange',
                'focus' => 'Present Perfect Continuous',
                'prompt' => 'Susun kata berikut menjadi kalimat yang benar.',
                'sentence' => 'She has been working here for three years.',
                'answer' => 'She has been working here for three years.',
                'explanation' => 'Present perfect continuous: has/have + been + kata kerja -ing untuk aksi yang berlanjut hingga sekarang.',
            ],
            [
                'level' => 'pre_intermediate',
                'type' => 'sentence_arrange',
                'focus' => 'Would Rather',
                'prompt' => 'Susun kata berikut menjadi kalimat yang benar.',
                'sentence' => 'I would rather stay at home tonight.',
                'answer' => 'I would rather stay at home tonight.',
                'explanation' => '"Would rather" diikuti kata kerja bentuk dasar tanpa "to".',
            ],
            [
                'level' => 'pre_intermediate',
                'type' => 'sentence_arrange',
                'focus' => 'Relative Clause',
                'prompt' => 'Susun kata berikut menjadi kalimat yang benar.',
                'sentence' => 'The book which you lent me was interesting.',
                'answer' => 'The book which you lent me was interesting.',
                'explanation' => '"Which" merujuk benda (the book) pada klausa relatif.',
            ],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function intermediateItems(): array
    {
        return [
            [
                'level' => 'intermediate',
                'type' => 'multiple_choice',
                'focus' => 'Third Conditional',
                'prompt' => 'Had I known about the delay, I ___ differently.',
                'options' => ['would have planned', 'would plan', 'will plan', 'planned'],
                'answer' => 'would have planned',
                'explanation' => 'Conditional tipe 3 membicarakan penyesalan masa lalu: had + past participle, lalu would have + past participle.',
            ],
            [
                'level' => 'intermediate',
                'type' => 'multiple_choice',
                'focus' => 'Passive Voice',
                'prompt' => 'The report needs ___ before Friday.',
                'options' => ['to finish', 'finishing', 'to be finished', 'finish'],
                'answer' => 'to be finished',
                'explanation' => 'Laporan tidak bisa menyelesaikan dirinya sendiri, sehingga dipakai bentuk pasif "needs to be finished".',
            ],
            [
                'level' => 'intermediate',
                'type' => 'multiple_choice',
                'focus' => 'Inversion',
                'prompt' => 'Not only ___ the exam, but she also got the highest score.',
                'options' => ['she passed', 'did she pass', 'she did pass', 'passed she'],
                'answer' => 'did she pass',
                'explanation' => 'Setelah "not only" di awal kalimat, urutan kata dibalik (inversi) memakai kata bantu "did".',
            ],
            [
                'level' => 'intermediate',
                'type' => 'multiple_choice',
                'focus' => 'Subjunctive',
                'prompt' => 'It is essential that he ___ present at the meeting.',
                'options' => ['is', 'be', 'was', 'will be'],
                'answer' => 'be',
                'explanation' => 'Setelah ungkapan "it is essential that" dipakai bentuk subjunctive: kata kerja dasar tanpa tambahan.',
            ],
            [
                'level' => 'intermediate',
                'type' => 'multiple_choice',
                'focus' => 'Would Rather',
                'prompt' => 'She would rather we ___ the decision together.',
                'options' => ['make', 'made', 'will make', 'making'],
                'answer' => 'made',
                'explanation' => 'Ketika "would rather" diikuti subjek lain, kata kerjanya memakai bentuk past untuk situasi sekarang.',
            ],
            [
                'level' => 'intermediate',
                'type' => 'true_false',
                'focus' => 'Inversion',
                'prompt' => 'Kalimat "Never have I seen such a view" merupakan kalimat yang gramatikal.',
                'options' => ['Benar', 'Salah'],
                'answer' => 'Benar',
                'explanation' => 'Kata negatif di awal kalimat (never, hardly, seldom) memicu inversi antara kata bantu dan subjek.',
            ],
            [
                'level' => 'intermediate',
                'type' => 'true_false',
                'focus' => 'Concession',
                'prompt' => '"Despite of the rain, we continued the match" adalah bentuk yang benar.',
                'options' => ['Benar', 'Salah'],
                'answer' => 'Salah',
                'explanation' => 'Bentuk benarnya "Despite the rain" atau "In spite of the rain" — jangan menggabungkan keduanya.',
            ],
            [
                'level' => 'intermediate',
                'type' => 'true_false',
                'focus' => 'Subjunctive',
                'prompt' => 'Setelah "suggest that", kata kerja memakai bentuk dasar, misalnya "I suggest that he go".',
                'options' => ['Benar', 'Salah'],
                'answer' => 'Benar',
                'explanation' => 'Ini disebut mandative subjunctive dan lazim dalam bahasa Inggris formal maupun akademik.',
            ],
            [
                'level' => 'intermediate',
                'type' => 'true_false',
                'focus' => 'Causative',
                'prompt' => 'Kalimat "I had my car repaired" berarti saya sendiri yang memperbaiki mobil saya.',
                'options' => ['Benar', 'Salah'],
                'answer' => 'Salah',
                'explanation' => 'Bentuk causative "have something done" berarti orang lain yang mengerjakannya untuk kita.',
            ],
            [
                'level' => 'intermediate',
                'type' => 'sentence_arrange',
                'focus' => 'Inversion',
                'prompt' => 'Susun kata berikut menjadi kalimat yang benar.',
                'sentence' => 'Hardly had he arrived when the meeting began.',
                'answer' => 'Hardly had he arrived when the meeting began.',
                'explanation' => '"Hardly ... when" memakai inversi dan past perfect untuk aksi yang langsung diikuti aksi lain.',
            ],
            [
                'level' => 'intermediate',
                'type' => 'sentence_arrange',
                'focus' => 'Inversion',
                'prompt' => 'Susun kata berikut menjadi kalimat yang benar.',
                'sentence' => 'Under no circumstances should you reveal the password.',
                'answer' => 'Under no circumstances should you reveal the password.',
                'explanation' => 'Frasa negatif di awal kalimat membuat modal "should" berpindah ke depan subjek.',
            ],
            [
                'level' => 'intermediate',
                'type' => 'sentence_arrange',
                'focus' => 'Cleft Sentence',
                'prompt' => 'Susun kata berikut menjadi kalimat yang benar.',
                'sentence' => 'It was not until midnight that the results were announced.',
                'answer' => 'It was not until midnight that the results were announced.',
                'explanation' => 'Pola "it was not until ... that ..." menekankan waktu terjadinya suatu peristiwa.',
            ],
        ];
    }
};
