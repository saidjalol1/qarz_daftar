"""
Management command to seed initial data with 200 test clients and products
"""
from django.core.management.base import BaseCommand
from ledger.models import User, Client, Product, UsdRate


class Command(BaseCommand):
    help = 'Seed database with initial data (including 200 test clients and products)'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database with test data...')
        
        # Create/update superuser
        if not User.objects.filter(email='admin@qarzdaftar.uz').exists():
            user = User.objects.create_superuser(
                email='admin@qarzdaftar.uz',
                password='admin123',
                name='Super Admin',
                phone='+998901112233',
                telegram='superadmin'
            )
            self.stdout.write(self.style.SUCCESS(f'✓ Created superuser: {user.email}'))
        else:
            # Update password for existing admin
            admin = User.objects.get(email='admin@qarzdaftar.uz')
            admin.set_password('admin123')
            admin.save()
            self.stdout.write(self.style.WARNING('✗ Superuser already exists (password updated)'))
        
        # Generate 200 test clients
        uzbek_first_names = [
            'Aziz', 'Bobur', 'Davron', 'Eldor', 'Farrux', 'Gulnora', 'Humoyun', 'Iroda',
            'Jasur', 'Kamola', 'Laziz', 'Malika', 'Nodira', 'Otabek', 'Parvina', 'Qobil',
            'Ravshan', 'Sardor', 'Temur', 'Ulugbek', 'Vazira', 'Xamid', 'Yulduz', 'Zarina',
            'Alisher', 'Bekzod', 'Dilshod', 'Erkin', 'Farida', 'Gulsara', 'Husniddin', 'Iqbol',
            'Jamshid', 'Komila', 'Lochin', 'Mavjuda', 'Nodir', 'Ozoda', 'Payzullo', 'Qudrat'
        ]
        
        uzbek_last_names = [
            'Alimov', 'Boboev', 'Dadajonov', 'Ergashev', 'Fayzullayev', 'Gafurov', 'Hasanov',
            'Ibragimov', 'Jalilov', 'Karimov', 'Latipov', 'Mahmudov', 'Nazarov', 'Olimov',
            'Pulatov', 'Qosimov', 'Rahimov', 'Saidov', 'Tursunov', 'Usmonov', 'Vohidov',
            'Xolmatov', 'Yoqubov', 'Zaripov', 'Ahmedov', 'Begmatov', 'Davlatov', 'Eshonov'
        ]
        
        cities = ['Toshkent', 'Samarqand', 'Buxoro', 'Farg\'ona', 'Andijon', 'Namangan', 'Qo\'qon', 'Xiva']
        
        clients_created = 0
        clients_skipped = 0
        
        for i in range(200):
            first_name = uzbek_first_names[i % len(uzbek_first_names)]
            last_name = uzbek_last_names[i % len(uzbek_last_names)]
            city = cities[i % len(cities)]
            
            # Generate unique phone numbers
            phone_base = 90 + (i % 10)  # 90-99
            phone_mid = 100 + (i // 10)  # Ensures uniqueness
            phone_end = 1000 + (i * 37) % 9000  # Pseudo-random but deterministic
            phone = f'+998{phone_base}{phone_mid:03d}{phone_end:04d}'
            
            # Generate telegram username (2 out of 3 have telegram)
            telegram = f'{first_name.lower()}_{last_name.lower()}{i}' if i % 3 != 0 else ''
            
            # Create name with occasional city suffix
            name = f'{first_name} {last_name}'
            if i % 5 == 0:
                name += f' ({city})'
            
            # Create client
            client, created = Client.objects.get_or_create(
                phone=phone,
                defaults={'name': name, 'telegram': telegram}
            )
            
            if created:
                clients_created += 1
            else:
                clients_skipped += 1
        
        self.stdout.write(self.style.SUCCESS(f'✓ Clients: {clients_created} created, {clients_skipped} already existed'))
        
        # Generate 200 test products
        product_categories = {
            'Meva': ['Olma', 'Uzum', 'Nok', 'Anor', 'Shaftoli', 'O\'rik', 'Gilos', 'Qovun', 'Tarvuz', 'Banan'],
            'Sabzavot': ['Pomidor', 'Bodring', 'Piyoz', 'Sabzi', 'Lavlagi', 'Qovoq', 'Baqlajon', 'Qalampir', 'Kartoshka', 'Sarimsog'],
            'Don': ['Un', 'Guruch', 'Makaron', 'Loviya', 'Mosh', 'No\'xat', 'Maiz', 'Arpa', 'Tariq', 'Bulgur'],
            'Sut': ['Sut', 'Qatiq', 'Suzma', 'Qaymoq', 'Sariyog\'', 'Pishloq', 'Tvorog', 'Ayran', 'Qurt', 'Yogurt'],
            'Go\'sht': ['Mol go\'shti', 'Qo\'y go\'shti', 'Tovuq go\'shti', 'Qazi', 'Kolbasa', 'Baliq', 'Jigar', 'Ikra'],
            'Ichimlik': ['Choy', 'Kofe', 'Sharbat', 'Meva suvi', 'Gazlangan suv', 'Mineralli suv', 'Kompot', 'Limonad'],
            'Shirinlik': ['Shakar', 'Asal', 'Tort', 'Pishiriq', 'Shokolad', 'Konfet', 'Marmelad', 'Halva', 'Rahat'],
            'Oshxona': ['Tuz', 'Murch', 'Zira', 'Ko\'kat', 'Rayhon', 'Ukrop', 'Koriander', 'Ketchup', 'Mayonez', 'Sirka'],
            'Yog\'': ['Kungaboqar yog\'i', 'Zaytun yog\'i', 'Makkajo\'xori yog\'i', 'O\'simlik yog\'i', 'Kun yog\'i'],
            'Non': ['Oq non', 'Qora non', 'Tandir non', 'Lavash', 'Patir', 'Bulka', 'Kulcha', 'Somsa']
        }
        
        packages = ['', '1kg', '5kg', '10kg', '500g', '250g', '1L', '2L', '0.5L', 'dona', 'pachka', 'quti']
        qualities = ['', 'Yuqori sort', 'O\'rtacha', 'Iste\'mol', 'Premium', 'Arzon', 'Eksport']
        
        products_created = 0
        products_skipped = 0
        product_index = 0
        
        # Create products from categories
        for category, items in product_categories.items():
            for item in items:
                if product_index >= 200:
                    break
                
                # Create variations with packages and qualities
                package = packages[product_index % len(packages)]
                quality = qualities[product_index % len(qualities)]
                
                name = item
                if quality:
                    name = f'{quality} {name}'
                if package:
                    name = f'{name} ({package})'
                
                product, created = Product.objects.get_or_create(
                    name=name,
                    defaults={'name': name}
                )
                
                if created:
                    products_created += 1
                else:
                    products_skipped += 1
                
                product_index += 1
        
        # Fill remaining slots with generic products
        while product_index < 200:
            name = f'Tovar #{product_index + 1}'
            product, created = Product.objects.get_or_create(
                name=name,
                defaults={'name': name}
            )
            if created:
                products_created += 1
            else:
                products_skipped += 1
            product_index += 1
        
        self.stdout.write(self.style.SUCCESS(f'✓ Products: {products_created} created, {products_skipped} already existed'))
        
        # Initialize USD rate
        rate = UsdRate.current()
        self.stdout.write(self.style.SUCCESS(f'✓ USD rate initialized: {rate}'))
        
        self.stdout.write(self.style.SUCCESS('\n✅ Database seeded successfully!'))
        self.stdout.write(f'\nTotal: {Client.objects.count()} clients, {Product.objects.count()} products')
        self.stdout.write('\nLogin credentials:')
        self.stdout.write('  Email: admin@qarzdaftar.uz')
        self.stdout.write('  Password: admin123')
