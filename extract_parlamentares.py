import csv

parlamentares = set()

with open('2025 - CONTROLE INTERNO_ SUAG  - fomentos 2025.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        parlamentar = row.get('PARLAMENTAR', '').strip()
        if parlamentar and parlamentar.lower() != 'parlamentar':
            parlamentares.add(parlamentar)

sorted_parlamentares = sorted(list(parlamentares))
print(f'Total de parlamentares únicos: {len(sorted_parlamentares)}')
print('\nLista de parlamentares:')
for i, parlamentar in enumerate(sorted_parlamentares, 1):
    print(f'{i:2d}. {parlamentar}')
