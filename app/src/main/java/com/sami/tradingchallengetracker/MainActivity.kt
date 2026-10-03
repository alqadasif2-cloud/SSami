package com.sami.tradingchallengetracker

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import com.sami.tradingchallengetracker.data.ChallengeEntity
import com.sami.tradingchallengetracker.data.MilestoneEntity
import com.sami.tradingchallengetracker.data.MilestoneStatus
import com.sami.tradingchallengetracker.data.TradeEntity
import com.sami.tradingchallengetracker.data.TradeType
import com.sami.tradingchallengetracker.ui.*
import com.sami.tradingchallengetracker.util.AndroidAppUpdateConfig
import com.sami.tradingchallengetracker.util.CloudAsyncImage
import com.sami.tradingchallengetracker.util.FirebaseCloudHelper
import com.sami.tradingchallengetracker.util.Money
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Locale

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TradingChallengeTheme {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    TradingApp(viewModel)
                }
            }
        }
    }
}

enum class ScreenTab {
    DASHBOARD, ADMIN, CHAT, PRIVATE_CHAT, HISTORY, ROADMAP, SETTINGS
}

@Composable
fun TradingApp(viewModel: MainViewModel) {
    val context = LocalContext.current

    val currentVersionName = remember {
        try {
            val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            pInfo.versionName ?: "1.2.0"
        } catch (_: Exception) {
            "1.2.0"
        }
    }
    val currentVersionCode = remember {
        try {
            val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            if (Build.VERSION.SDK_INT >= 28) pInfo.longVersionCode.toInt() else @Suppress("DEPRECATION") pInfo.versionCode
        } catch (_: Exception) {
            10
        }
    }

    var appUpdateConfig by remember { mutableStateOf<AndroidAppUpdateConfig?>(null) }
    var userDismissedUpdate by remember { mutableStateOf(false) }

    DisposableEffect(Unit) {
        val reg = FirebaseCloudHelper.listenToAppUpdateConfig(context) { cfg ->
            appUpdateConfig = cfg
        }
        onDispose { reg.remove() }
    }

    val isUpdateAvailable = appUpdateConfig != null &&
        FirebaseCloudHelper.shouldPromptUpdate(appUpdateConfig!!, currentVersionCode, currentVersionName)
    val shouldShowUpdateDialog = isUpdateAvailable && (!userDismissedUpdate || (appUpdateConfig?.isMandatory == true))

    var currentUser by remember {
        val prefs = context.getSharedPreferences("sami_auth_prefs", Context.MODE_PRIVATE)
        val userId = prefs.getInt("user_id", -1)
        val username = prefs.getString("username", null)
        val displayName = prefs.getString("display_name", null)
        val role = prefs.getString("user_role", null) ?: if (userId == 1) "owner" else "user"
        val avatarUrl = prefs.getString("avatar_url", null)
        mutableStateOf(
            if (userId != -1 && username != null && displayName != null) {
                AndroidAuthUser(
                    id = userId,
                    username = username,
                    displayName = displayName,
                    password = "",
                    role = CommunityCloudManager.normalizeRole(userId, username, role),
                    avatarUrl = avatarUrl
                )
            } else null
        )
    }

    // Mandatory Login Screen if not authenticated
    val activeUser = currentUser
    if (activeUser == null) {
        Box(modifier = Modifier.fillMaxSize()) {
            AndroidLoginScreen(onLoginSuccess = { user ->
                viewModel.setCurrentUser(user.id, user.displayName)
                currentUser = user
            })

            val cfg = appUpdateConfig
            if (shouldShowUpdateDialog && cfg != null) {
                AppUpdateDialog(
                    config = cfg,
                    currentVersionName = currentVersionName,
                    currentVersionCode = currentVersionCode,
                    onDismiss = { userDismissedUpdate = true }
                )
            }
        }
        return
    }

    // Request POST_NOTIFICATIONS permission on Android 13+ so system alerts with sound & vibration work
    val notifPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { _ -> }

    LaunchedEffect(activeUser.id) {
        viewModel.setCurrentUser(activeUser.id, activeUser.displayName)
        if (Build.VERSION.SDK_INT >= 33) {
            val hasNotifPerm = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!hasNotifPerm) {
                notifPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    val challenge by viewModel.challenge.collectAsState()
    val trades by viewModel.trades.collectAsState()
    val milestones by viewModel.milestones.collectAsState()

    var activeTab by remember { mutableStateOf(ScreenTab.DASHBOARD) }
    var showAddTradeModal by remember { mutableStateOf(false) }
    var selectedTrade by remember { mutableStateOf<TradeEntity?>(null) }
    var selectedMilestone by remember { mutableStateOf<MilestoneEntity?>(null) }
    var viewingImageUrl by remember { mutableStateOf<String?>(null) }
    var showResetDialog by remember { mutableStateOf(false) }
    var showStartDialog by remember { mutableStateOf(false) }
    var showNewChallengeDialog by remember { mutableStateOf(false) }
    var newCapitalInput by remember { mutableStateOf("500") }
    var notificationMessage by remember { mutableStateOf<String?>(null) }
    var liveCommunityNotif by remember { mutableStateOf<AndroidCommunityNotification?>(null) }

    // Subscribe to live user document changes (role promotion/demotion, avatar, account deletion)
    DisposableEffect(activeUser.id) {
        val db = FirebaseCloudHelper.getFirestore(context)
        val userDocReg = db.collection("community_users").document(activeUser.id.toString())
            .addSnapshotListener { snap, _ ->
                if (snap == null) return@addSnapshotListener
                if (!snap.exists() && activeUser.id != 1) {
                    val prefs = context.getSharedPreferences("sami_auth_prefs", Context.MODE_PRIVATE)
                    prefs.edit().clear().apply()
                    viewModel.clearSession()
                    currentUser = null
                    return@addSnapshotListener
                }
                if (snap.exists()) {
                    val updated = CommunityCloudManager.parseUserSnapshot(snap.data, activeUser.id)
                    currentUser = updated
                    val prefs = context.getSharedPreferences("sami_auth_prefs", Context.MODE_PRIVATE)
                    prefs.edit()
                        .putString("display_name", updated.displayName)
                        .putString("user_role", updated.role)
                        .putString("avatar_url", updated.avatarUrl)
                        .apply()
                }
            }

        val notifReg = CommunityCloudManager.subscribeToNotificationsForUser(
            context = context,
            currentUserId = activeUser.id
        ) { notif ->
            liveCommunityNotif = notif
        }

        onDispose {
            userDocReg.remove()
            notifReg.remove()
        }
    }

    LaunchedEffect(notificationMessage) {
        if (notificationMessage != null) {
            delay(4000)
            notificationMessage = null
        }
    }

    LaunchedEffect(liveCommunityNotif) {
        if (liveCommunityNotif != null) {
            delay(6500)
            liveCommunityNotif = null
        }
    }

    val isOwner = activeUser.id == 1 || activeUser.role == "owner"
    val isModerator = !isOwner && activeUser.role == "moderator"

    Scaffold(
        bottomBar = {
            Surface(
                color = Color(0xFF060A14),
                tonalElevation = 12.dp,
                shadowElevation = 16.dp,
                border = BorderStroke(0.8.dp, Color(0x33F59E0B))
            ) {
                NavigationBar(
                    containerColor = Color.Transparent,
                    tonalElevation = 0.dp
                ) {
                    val navItems = buildList {
                        add(Triple(ScreenTab.DASHBOARD, "الرئيسية", Icons.Default.Home))
                        if (isOwner) {
                            add(Triple(ScreenTab.ADMIN, "الإدارة", Icons.Default.AdminPanelSettings))
                        }
                        add(Triple(ScreenTab.CHAT, "القنوات", Icons.Default.Groups))
                        if (isModerator) {
                            add(Triple(ScreenTab.PRIVATE_CHAT, "مراسلة Sami", Icons.Default.Forum))
                            add(Triple(ScreenTab.SETTINGS, "الإعدادات", Icons.Default.Settings))
                        } else {
                            add(Triple(ScreenTab.HISTORY, "سجل الصفقات", Icons.Default.MenuBook))
                            add(Triple(ScreenTab.ROADMAP, "المحطات", Icons.Default.LocationOn))
                            add(Triple(ScreenTab.SETTINGS, "الإعدادات", Icons.Default.Settings))
                        }
                    }

                    navItems.forEach { (tab, label, iconVec) ->
                        val isSelected = activeTab == tab || (tab == ScreenTab.CHAT && activeTab == ScreenTab.PRIVATE_CHAT && !isModerator)
                        NavigationBarItem(
                            selected = isSelected,
                            onClick = { activeTab = tab },
                            icon = {
                                Icon(
                                    imageVector = iconVec,
                                    contentDescription = label,
                                    modifier = Modifier.size(if (isSelected) 25.dp else 22.dp)
                                )
                            },
                            label = {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = label,
                                        fontSize = 9.5.sp,
                                        fontWeight = if (isSelected) FontWeight.Black else FontWeight.SemiBold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Spacer(modifier = Modifier.height(3.dp))
                                    if (isSelected) {
                                        Box(
                                            modifier = Modifier
                                                .width(26.dp)
                                                .height(3.dp)
                                                .clip(RoundedCornerShape(50))
                                                .background(
                                                    Brush.horizontalGradient(
                                                        listOf(
                                                            Color(0xFFFDE68A),
                                                            Color(0xFFFBBF24),
                                                            Color(0xFFF59E0B)
                                                        )
                                                    )
                                                )
                                        )
                                    } else {
                                        Spacer(modifier = Modifier.height(3.dp))
                                    }
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Color(0xFFFBBF24),
                                selectedTextColor = Color(0xFFFBBF24),
                                indicatorColor = Color(0x1AF59E0B),
                                unselectedIconColor = TextMuted,
                                unselectedTextColor = TextMuted
                            )
                        )
                    }
                }
            }
        },
        containerColor = DarkBg
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(DarkBg)
        ) {
            val ch = challenge
            if (ch != null) {
                // Background image ONLY on Dashboard screen (and Login screen)
                if (activeTab == ScreenTab.DASHBOARD) {
                    LoopingBackgroundVideo(rawResId = R.drawable.background_image, overlayAlpha = 0.78f)
                }

                when (activeTab) {
                    ScreenTab.DASHBOARD -> {
                        if (isModerator) {
                            AndroidModeratorHomeScreen(
                                currentUser = activeUser,
                                onOpenChannels = { activeTab = ScreenTab.CHAT },
                                onOpenPrivateChat = { activeTab = ScreenTab.PRIVATE_CHAT },
                                onLogout = {
                                    val prefs = context.getSharedPreferences("sami_auth_prefs", Context.MODE_PRIVATE)
                                    prefs.edit().clear().apply()
                                    viewModel.clearSession()
                                    activeTab = ScreenTab.DASHBOARD
                                    currentUser = null
                                },
                                onAvatarUpdated = { newUrl ->
                                    currentUser = activeUser.copy(avatarUrl = newUrl)
                                }
                            )
                        } else {
                            DashboardContent(
                                challenge = ch,
                                currentUser = activeUser,
                                trades = trades,
                                notificationMessage = notificationMessage,
                                onOpenSettings = { activeTab = ScreenTab.SETTINGS },
                                onOpenAdminPanel = { activeTab = ScreenTab.ADMIN },
                                onOpenPrivateChat = { activeTab = ScreenTab.PRIVATE_CHAT },
                                onOpenAddTrade = { showAddTradeModal = true },
                                onStartChallenge = { showStartDialog = true },
                                onNewChallenge = {
                                    newCapitalInput = (ch.initialCapitalCents / 100L).toString()
                                    showNewChallengeDialog = true
                                },
                                onAvatarUpdated = { newUrl ->
                                    currentUser = activeUser.copy(avatarUrl = newUrl)
                                }
                            )
                        }
                    }
                    ScreenTab.ADMIN -> AndroidOwnerAdminScreen(
                        currentUser = activeUser
                    )
                    ScreenTab.CHAT -> AndroidGroupChatScreen(
                        currentUser = activeUser,
                        initialMode = "channels",
                        onUserUpdated = { updated -> currentUser = updated }
                    )
                    ScreenTab.PRIVATE_CHAT -> AndroidGroupChatScreen(
                        currentUser = activeUser,
                        initialMode = "private_chat",
                        onUserUpdated = { updated -> currentUser = updated }
                    )
                    ScreenTab.HISTORY -> HistoryContent(
                        trades = trades,
                        onSharePdf = {
                            viewModel.sharePdfReport(context) { errMsg ->
                                notificationMessage = errMsg
                            }
                        },
                        onSelectTrade = { selectedTrade = it },
                        onOpenAddTrade = { showAddTradeModal = true }
                    )
                    ScreenTab.ROADMAP -> RoadmapContent(
                        milestones = milestones,
                        trades = trades,
                        onSelectMilestone = { selectedMilestone = it }
                    )
                    ScreenTab.SETTINGS -> SettingsContent(
                        challenge = ch,
                        currentUser = activeUser,
                        onLogout = {
                            val prefs = context.getSharedPreferences("sami_auth_prefs", Context.MODE_PRIVATE)
                            prefs.edit().clear().apply()
                            viewModel.clearSession()
                            selectedTrade = null
                            selectedMilestone = null
                            viewingImageUrl = null
                            activeTab = ScreenTab.DASHBOARD
                            currentUser = null
                        },
                        onSave = { name, initCap, target ->
                            viewModel.saveSettings(name, initCap, target)
                        },
                        onResetClick = { showResetDialog = true },
                        onNewChallengeClick = {
                            newCapitalInput = (ch.initialCapitalCents / 100L).toString()
                            showNewChallengeDialog = true
                        },
                        onAvatarUpdated = { newUrl ->
                            currentUser = activeUser.copy(avatarUrl = newUrl)
                        }
                    )
                }
            } else {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = AmberAccent
                )
            }

            // Floating Real-Time Community Notification Banner
            val activeAlert = liveCommunityNotif
            if (activeAlert != null) {
                Surface(
                    color = Color(0xF0121824),
                    shape = RoundedCornerShape(18.dp),
                    border = androidx.compose.foundation.BorderStroke(1.5.dp, AmberAccent),
                    shadowElevation = 10.dp,
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(12.dp)
                        .fillMaxWidth()
                        .clickable {
                            activeTab = if (activeAlert.type == "private_message") {
                                if (isModerator) ScreenTab.PRIVATE_CHAT else ScreenTab.CHAT
                            } else {
                                ScreenTab.CHAT
                            }
                            liveCommunityNotif = null
                        }
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.NotificationsActive, contentDescription = null, tint = AmberAccent)
                            Column {
                                Text(activeAlert.title, color = AmberAccent, fontWeight = FontWeight.Black, fontSize = 12.sp)
                                Text(activeAlert.body, color = Color.White, fontSize = 11.sp, maxLines = 2)
                            }
                        }
                        IconButton(onClick = { liveCommunityNotif = null }) {
                            Icon(Icons.Default.Close, contentDescription = "إغلاق", tint = Color.LightGray)
                        }
                    }
                }
            }
        }
    }

    // Add Trade Modal Dialog with Gallery & Camera Image Attachment
    val activeChallengeForTrade = challenge
    if (showAddTradeModal && activeChallengeForTrade != null) {
        var tradeInput by remember { mutableStateOf("") }
        var isLossSign by remember { mutableStateOf(false) }
        var attachmentUri by remember { mutableStateOf<Uri?>(null) }
        var pendingCameraUri by remember { mutableStateOf<Uri?>(null) }
        var errorMsg by remember { mutableStateOf<String?>(null) }
        var isSubmitting by remember { mutableStateOf(false) }

        val galleryLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.GetContent()
        ) { uri: Uri? ->
            if (uri != null) {
                attachmentUri = uri
                errorMsg = null
            }
        }

        val cameraLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.TakePicture()
        ) { success: Boolean ->
            if (success && pendingCameraUri != null) {
                attachmentUri = pendingCameraUri
                errorMsg = null
            }
        }

        val cameraPermissionLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.RequestPermission()
        ) { isGranted: Boolean ->
            if (isGranted) {
                val outUri = FirebaseCloudHelper.createCameraOutputUri(context)
                pendingCameraUri = outUri
                cameraLauncher.launch(outUri)
            } else {
                errorMsg = "يرجى السماح بصلاحية الكاميرا لالتقاط صورة الصفقة."
            }
        }

        val projectedBalanceCents = remember(tradeInput, isLossSign, activeChallengeForTrade.currentBalanceCents) {
            val raw = tradeInput.trim()
            if (raw.isEmpty()) {
                activeChallengeForTrade.currentBalanceCents
            } else {
                val withSign = if (!raw.startsWith("+") && !raw.startsWith("-")) {
                    if (isLossSign) "-$raw" else "+$raw"
                } else raw
                val parsed = Money.parseToCents(withSign)
                if (parsed.isSuccess) {
                    activeChallengeForTrade.currentBalanceCents + parsed.getOrThrow()
                } else {
                    activeChallengeForTrade.currentBalanceCents
                }
            }
        }

        AlertDialog(
            onDismissRequest = { if (!isSubmitting) showAddTradeModal = false },
            title = {
                Text(
                    "إضافة صفقة جديدة (الصفقة #${activeChallengeForTrade.tradeCount + 1})",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = Color.White
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Surface(
                        color = Color(0xFF141B2A),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("الرصيد الحالي", fontSize = 11.sp, color = TextMuted)
                            Text(
                                Money.format(activeChallengeForTrade.currentBalanceCents),
                                fontWeight = FontWeight.Black,
                                fontSize = 20.sp,
                                color = Color.White
                            )
                            if (tradeInput.isNotBlank()) {
                                Text(
                                    "الرصيد المتوقع بعد الصفقة: ${Money.format(projectedBalanceCents)}",
                                    fontSize = 11.sp,
                                    color = AmberAccent,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            }
                        }
                    }

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Button(
                            onClick = { isLossSign = false },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (!isLossSign) ProfitGreen else Color(0xFF1E293B)
                            ),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("ربح (+)", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        Button(
                            onClick = { isLossSign = true },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isLossSign) LossRed else Color(0xFF1E293B)
                            ),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("خسارة (-)", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }

                    OutlinedTextField(
                        value = tradeInput,
                        onValueChange = { tradeInput = it; errorMsg = null },
                        placeholder = { Text("أدخل القيمة (مثال: 20 أو -15)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    // Image Attachment Section (Gallery + Camera)
                    Text("إرفاق صورة الصفقة (اختياري • سحابي)", fontSize = 12.sp, color = TextMuted, fontWeight = FontWeight.Bold)

                    if (attachmentUri != null) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(130.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .border(1.dp, AmberAccent, RoundedCornerShape(12.dp))
                        ) {
                            AsyncImage(
                                model = attachmentUri,
                                contentDescription = "مرفق الصفقة",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                            IconButton(
                                onClick = { attachmentUri = null },
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(6.dp)
                                    .background(Color.Black.copy(alpha = 0.7f), CircleShape)
                                    .size(28.dp)
                            ) {
                                Icon(Icons.Default.Delete, contentDescription = "حذف الصورة", tint = LossRed, modifier = Modifier.size(16.dp))
                            }
                        }
                    } else {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            OutlinedButton(
                                onClick = { galleryLauncher.launch("image/*") },
                                modifier = Modifier.weight(1f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
                            ) {
                                Icon(Icons.Default.Image, contentDescription = null, tint = AmberAccent, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("المعرض", fontSize = 11.sp, color = Color.White)
                            }
                            OutlinedButton(
                                onClick = {
                                    val hasCamPerm = ContextCompat.checkSelfPermission(
                                        context,
                                        Manifest.permission.CAMERA
                                    ) == PackageManager.PERMISSION_GRANTED
                                    if (hasCamPerm) {
                                        val outUri = FirebaseCloudHelper.createCameraOutputUri(context)
                                        pendingCameraUri = outUri
                                        cameraLauncher.launch(outUri)
                                    } else {
                                        cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                                    }
                                },
                                modifier = Modifier.weight(1f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
                            ) {
                                Icon(Icons.Default.PhotoCamera, contentDescription = null, tint = AmberAccent, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("الكاميرا", fontSize = 11.sp, color = Color.White)
                            }
                        }
                    }

                    val currentErrorMsg = errorMsg
                    if (currentErrorMsg != null) {
                        Text(currentErrorMsg, color = LossRed, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {
                Button(
                    enabled = !isSubmitting,
                    onClick = {
                        val raw = tradeInput.trim()
                        val inputWithSign = if (!raw.startsWith("+") && !raw.startsWith("-")) {
                            if (isLossSign) "-$raw" else "+$raw"
                        } else raw
                        val parseResult = Money.parseToCents(inputWithSign)
                        if (parseResult.isSuccess) {
                            val cents = parseResult.getOrThrow()
                            isSubmitting = true
                            viewModel.recordTrade(
                                resultCents = cents,
                                attachmentUri = attachmentUri,
                                onSuccess = { num ->
                                    isSubmitting = false
                                    showAddTradeModal = false
                                    notificationMessage = "تم تسجيل الصفقة #$num بنجاح"
                                },
                                onError = {
                                    isSubmitting = false
                                    errorMsg = it
                                }
                            )
                        } else {
                            errorMsg = parseResult.exceptionOrNull()?.message ?: "رقم غير صحيح"
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AmberAccent)
                ) {
                    Text(
                        if (isSubmitting) "جاري الحفظ..." else "تأكيد الصفقة",
                        color = Color.Black,
                        fontWeight = FontWeight.Bold
                    )
                }
            },
            dismissButton = {
                TextButton(
                    enabled = !isSubmitting,
                    onClick = { showAddTradeModal = false }
                ) {
                    Text("إلغاء", color = Color.LightGray)
                }
            },
            containerColor = CardBg
        )
    }

    // Trade Detail Dialog
    val activeSelectedTrade = selectedTrade
    if (activeSelectedTrade != null) {
        val trade = activeSelectedTrade
        val isWin = trade.type == TradeType.WIN
        AlertDialog(
            onDismissRequest = { selectedTrade = null },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("تفاصيل الصفقة #${trade.tradeNumber}", fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color.White)
                    Surface(
                        color = if (isWin) Color(0x2210B981) else Color(0x22EF4444),
                        shape = RoundedCornerShape(50)
                    ) {
                        Text(
                            text = if (isWin) "WIN ✔" else "LOSS ✕",
                            color = if (isWin) ProfitGreen else LossRed,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Surface(
                        color = Color(0xFF141B2A),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("النتيجة", fontSize = 11.sp, color = TextMuted)
                            Text(
                                Money.format(trade.resultCents, true),
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Black,
                                color = if (isWin) ProfitGreen else LossRed
                            )
                        }
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("الرصيد السابق:", color = TextMuted, fontSize = 12.sp)
                        Text(Money.format(trade.oldBalanceCents), color = Color.LightGray, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("الرصيد الجديد:", color = TextMuted, fontSize = 12.sp)
                        Text(Money.format(trade.newBalanceCents), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("التاريخ والوقت:", color = TextMuted, fontSize = 12.sp)
                        Text(Money.formatDateTime(trade.timestamp), color = Color.LightGray, fontSize = 12.sp)
                    }

                    if (!trade.attachmentPath.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("المرفقات:", color = TextMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(140.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .clickable { viewingImageUrl = trade.attachmentPath }
                        ) {
                            CloudAsyncImage(
                                imageUrl = trade.attachmentPath,
                                contentDescription = "مرفق الصفقة",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        }
                        TextButton(
                            onClick = { viewingImageUrl = trade.attachmentPath },
                            modifier = Modifier.align(Alignment.CenterHorizontally)
                        ) {
                            Icon(Icons.Default.Visibility, contentDescription = null, tint = AmberAccent, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("عرض الصورة بحجم كامل", color = AmberAccent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { selectedTrade = null },
                    colors = ButtonDefaults.buttonColors(containerColor = AmberAccent)
                ) {
                    Text("إغلاق", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            },
            containerColor = CardBg
        )
    }

    // Milestone Detail Dialog
    val activeSelectedMilestone = selectedMilestone
    if (activeSelectedMilestone != null) {
        val m = activeSelectedMilestone
        val isWin = m.status == MilestoneStatus.WIN
        val isLoss = m.status == MilestoneStatus.LOSS
        AlertDialog(
            onDismissRequest = { selectedMilestone = null },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("تفاصيل المحطة #${m.milestoneNumber}", fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color.White)
                    Text(
                        text = when {
                            isWin -> "WIN ✔"
                            isLoss -> "LOSS ✕"
                            else -> "لم تبدأ بعد"
                        },
                        color = when {
                            isWin -> ProfitGreen
                            isLoss -> LossRed
                            else -> TextMuted
                        },
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("الربح / النتيجة:", color = TextMuted, fontSize = 12.sp)
                        Text(
                            Money.format(m.profitCents, true),
                            color = if (isWin) ProfitGreen else if (isLoss) LossRed else TextMuted,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("رصيد الحساب:", color = TextMuted, fontSize = 12.sp)
                        Text(Money.format(m.balanceCents), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("تاريخ الصفقة:", color = TextMuted, fontSize = 12.sp)
                        val milestoneTimestamp = m.timestamp
                        Text(
                            if (milestoneTimestamp != null) Money.formatDateTime(milestoneTimestamp) else "-",
                            color = Color.LightGray,
                            fontSize = 12.sp
                        )
                    }

                    if (!m.attachmentPath.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("صورة الصفقة المرفقة:", color = TextMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(140.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .clickable { viewingImageUrl = m.attachmentPath }
                        ) {
                            CloudAsyncImage(
                                imageUrl = m.attachmentPath,
                                contentDescription = "مرفق المحطة",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        }
                        TextButton(
                            onClick = { viewingImageUrl = m.attachmentPath },
                            modifier = Modifier.align(Alignment.CenterHorizontally)
                        ) {
                            Icon(Icons.Default.Visibility, contentDescription = null, tint = AmberAccent, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("عرض الصورة بحجم كامل", color = AmberAccent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { selectedMilestone = null },
                    colors = ButtonDefaults.buttonColors(containerColor = AmberAccent)
                ) {
                    Text("إغلاق", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            },
            containerColor = CardBg
        )
    }

    // Fullscreen Image Lightbox Dialog
    val activeViewingImageUrl = viewingImageUrl
    if (activeViewingImageUrl != null) {
        FullScreenImageViewerDialog(
            imageUrl = activeViewingImageUrl,
            onDismiss = { viewingImageUrl = null }
        )
    }

    // Reset Confirmation
    if (showResetDialog) {
        AlertDialog(
            onDismissRequest = { showResetDialog = false },
            title = { Text("إعادة الرحلة؟", fontWeight = FontWeight.Bold, color = Color.White) },
            text = {
                Text(
                    "سيؤدي هذا الإجراء إلى حذف سجل الصفقات وإعادة جميع المحطات إلى حالتها الأولية.\nهل أنت متأكد؟",
                    color = Color.LightGray
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.resetChallenge {
                            showResetDialog = false
                            notificationMessage = "تم إعادة ضبط الرحلة بنجاح"
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = LossRed)
                ) {
                    Text("تأكيد", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showResetDialog = false }) {
                    Text("إلغاء", color = Color.LightGray)
                }
            },
            containerColor = CardBg
        )
    }

    // Start Challenge Confirmation
    val activeChallengeForStart = challenge
    if (showStartDialog && activeChallengeForStart != null) {
        AlertDialog(
            onDismissRequest = { showStartDialog = false },
            title = { Text("تأكيد بدء الرحلة", fontWeight = FontWeight.Bold, color = Color.White) },
            text = {
                Text(
                    "سيتم بدء الرحلة برأس مال ${Money.format(activeChallengeForStart.initialCapitalCents)}.\nهل أنت متأكد من بدء الرحلة؟",
                    color = Color.LightGray
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.startChallenge()
                        showStartDialog = false
                        notificationMessage = "تم بدء الرحلة برأس مال ${Money.format(activeChallengeForStart.initialCapitalCents)}"
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AmberAccent)
                ) {
                    Text("تأكيد", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showStartDialog = false }) {
                    Text("إلغاء", color = Color.LightGray)
                }
            },
            containerColor = CardBg
        )
    }

    // New Challenge Dialog with Quick Capital Presets
    if (showNewChallengeDialog) {
        var error by remember { mutableStateOf<String?>(null) }
        AlertDialog(
            onDismissRequest = { showNewChallengeDialog = false },
            title = { Text("بدء رحلة جديدة", fontWeight = FontWeight.Bold, color = Color.White) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("أدخل رأس المال الابتدائي للرحلة الجديدة ($):", color = Color.LightGray, fontSize = 12.sp)
                    OutlinedTextField(
                        value = newCapitalInput,
                        onValueChange = { newCapitalInput = it; error = null },
                        placeholder = { Text("500") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        listOf(50, 100, 250, 500, 1000).forEach { preset ->
                            Surface(
                                color = Color(0xFF1E293B),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable {
                                        newCapitalInput = preset.toString()
                                        error = null
                                    }
                            ) {
                                Text(
                                    text = "$$preset",
                                    color = AmberAccent,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 6.dp)
                                )
                            }
                        }
                    }
                    val currentError = error
                    if (currentError != null) {
                        Text(currentError, color = LossRed, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val parsed = Money.parseCapitalToCents(newCapitalInput)
                        if (parsed.isSuccess) {
                            val newCap = parsed.getOrThrow()
                            viewModel.startNewChallenge(newCap) {
                                showNewChallengeDialog = false
                                notificationMessage = "تم بدء الرحلة الجديدة برأس مال ${Money.format(newCap)}"
                            }
                        } else {
                            error = parsed.exceptionOrNull()?.message ?: "قيمة غير صحيحة"
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AmberAccent)
                ) {
                    Text("بدء الرحلة", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showNewChallengeDialog = false }) {
                    Text("إلغاء", color = Color.LightGray)
                }
            },
            containerColor = CardBg
        )
    }

    // App Update Dialog for authenticated session
    val cfg = appUpdateConfig
    if (shouldShowUpdateDialog && cfg != null) {
        AppUpdateDialog(
            config = cfg,
            currentVersionName = currentVersionName,
            currentVersionCode = currentVersionCode,
            onDismiss = { userDismissedUpdate = true }
        )
    }
}

@Composable
fun DashboardContent(
    challenge: ChallengeEntity,
    currentUser: AndroidAuthUser,
    trades: List<TradeEntity>,
    notificationMessage: String?,
    onOpenSettings: () -> Unit,
    onOpenAdminPanel: () -> Unit,
    onOpenPrivateChat: () -> Unit = {},
    onOpenAddTrade: () -> Unit,
    onStartChallenge: () -> Unit,
    onNewChallenge: () -> Unit,
    onAvatarUpdated: (String) -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var uploadingAvatar by remember { mutableStateOf(false) }

    val avatarLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            uploadingAvatar = true
            coroutineScope.launch {
                try {
                    val url = CommunityCloudManager.uploadUserAvatar(context, currentUser.id, uri)
                    onAvatarUpdated(url)
                    Toast.makeText(context, "تم تحديث صورتك الشخصية بنجاح", Toast.LENGTH_SHORT).show()
                } catch (_: Exception) {
                    Toast.makeText(context, "تعذر تحديث الصورة الشخصية", Toast.LENGTH_SHORT).show()
                } finally {
                    uploadingAvatar = false
                }
            }
        }
    }

    val progress = Money.calculateProgress(challenge.currentBalanceCents, challenge.targetBalanceCents)
    val animatedProgress by animateFloatAsState(
        targetValue = (progress / 100f).coerceIn(if (progress > 0f) 0.04f else 0.02f, 1f),
        animationSpec = tween(durationMillis = 700),
        label = "dashboardProgress"
    )
    val isTargetReached = challenge.currentBalanceCents >= challenge.targetBalanceCents
    val completedTradesCount = trades.count { it.type == TradeType.WIN }
    val remainingTrades = (150 - completedTradesCount).coerceAtLeast(0)
    val isOwner = currentUser.id == 1 || currentUser.role == "owner"

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Top Brand Bar + Private Chat / Admin Button
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Surface(
                    color = Color(0x26F59E0B),
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, Color(0x80FBBF24))
                ) {
                    Icon(
                        imageVector = Icons.Default.WorkspacePremium,
                        contentDescription = null,
                        tint = Color(0xFFFBBF24),
                        modifier = Modifier.padding(4.dp).size(16.dp)
                    )
                }
                Text("Sami", color = Color(0xFFFBBF24), fontWeight = FontWeight.Black, fontSize = 13.sp)
                Text("•", color = Color(0x80FBBF24), fontSize = 12.sp)
                Text("مجتمع الربح والنجاح", color = Color(0xFFCBD5E1), fontWeight = FontWeight.SemiBold, fontSize = 11.sp)
            }

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                if (isOwner) {
                    Surface(
                        color = Color(0x26F59E0B),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, Color(0x80FBBF24)),
                        modifier = Modifier.clickable { onOpenAdminPanel() }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(Icons.Default.AdminPanelSettings, contentDescription = null, tint = Color(0xFFFBBF24), modifier = Modifier.size(14.dp))
                            Text("لوحة القائد", color = Color(0xFFFDE68A), fontSize = 10.5.sp, fontWeight = FontWeight.Black)
                        }
                    }
                }
                Surface(
                    color = Color(0xFF0E1628),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Color(0x66F59E0B)),
                    modifier = Modifier.clickable { onOpenPrivateChat() }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(5.dp)
                    ) {
                        Icon(Icons.Default.Forum, contentDescription = null, tint = Color(0xFFFBBF24), modifier = Modifier.size(14.dp))
                        Text("محادثة خاصة", color = Color(0xFFFDE68A), fontSize = 10.5.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // User Account Luxury Header Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0C1323)),
            border = BorderStroke(1.dp, Color(0x55F59E0B))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box {
                        UserCircularAvatar(
                            avatarUrl = currentUser.avatarUrl,
                            displayName = currentUser.displayName,
                            userId = currentUser.id,
                            role = currentUser.role,
                            size = 52.dp,
                            onClick = { avatarLauncher.launch("image/*") }
                        )
                        if (uploadingAvatar) {
                            CircularProgressIndicator(
                                modifier = Modifier
                                    .size(16.dp)
                                    .align(Alignment.BottomEnd),
                                strokeWidth = 2.dp,
                                color = Color(0xFFFBBF24)
                            )
                        }
                    }
                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text("تطبيق Sami", fontSize = 11.sp, color = Color(0xFF94A3B8), fontWeight = FontWeight.SemiBold)
                            RoleBadgeChip(role = currentUser.role, senderId = currentUser.id)
                        }
                        Text(
                            text = challenge.userName.ifEmpty { currentUser.displayName },
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )
                    }
                }

                Surface(
                    color = Color(0xFF151F35),
                    shape = CircleShape,
                    border = BorderStroke(1.dp, Color(0xFF334155)),
                    modifier = Modifier.size(40.dp).clickable { onOpenSettings() }
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "الإعدادات",
                            tint = Color(0xFFE2E8F0),
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }

        // In-App Notification Banner
        if (notificationMessage != null) {
            Surface(
                color = Color(0x2610B981),
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, ProfitGreen.copy(alpha = 0.5f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = ProfitGreen, modifier = Modifier.size(18.dp))
                    Text(notificationMessage, color = ProfitGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Target Reached Banner
        if (isTargetReached) {
            Surface(
                color = Color(0x33F59E0B),
                shape = RoundedCornerShape(18.dp),
                border = BorderStroke(1.dp, Color(0xFFFBBF24)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("🎯 تم الوصول إلى الهدف النهائي!", color = Color(0xFFFBBF24), fontWeight = FontWeight.Black, fontSize = 14.sp)
                    Text("تهانينا! يمكنك الاستمرار في التداول حتى المحطة الـ150.", color = Color.LightGray, fontSize = 11.sp)
                }
            }
        }

        // =====================================================================
        // HERO BALANCE & 3D PROGRESS CARD (البطاقة الرئيسية الفاخرة)
        // =====================================================================
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0A101F)),
            shape = RoundedCornerShape(26.dp),
            border = BorderStroke(1.2.dp, Color(0x80F59E0B)),
            elevation = CardDefaults.cardElevation(defaultElevation = 10.dp)
        ) {
            Box(modifier = Modifier.fillMaxWidth()) {
                // Trading Bull & Candlestick Artwork Background inside Hero Card
                Image(
                    painter = painterResource(id = R.drawable.background_image),
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.matchParentSize(),
                    alpha = 0.38f
                )
                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(
                                    Color(0x99080D1A),
                                    Color(0xEE080D1A)
                                )
                            )
                        )
                )

                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Surface(
                            color = Color(0x26F59E0B),
                            shape = CircleShape,
                            border = BorderStroke(1.dp, Color(0x80FBBF24)),
                            modifier = Modifier.size(28.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.MonetizationOn,
                                    contentDescription = null,
                                    tint = Color(0xFFFBBF24),
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                        Text(
                            text = "الرصيد الحالي",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFE2E8F0)
                        )
                    }

                    Text(
                        text = Money.format(challenge.currentBalanceCents),
                        fontSize = 36.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFFFBBF24)
                    )

                    HorizontalDivider(color = Color(0x33F59E0B), thickness = 1.dp)

                    // 3D Luminous Progress Section
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "الهدف: ${Money.format(challenge.targetBalanceCents)}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFCBD5E1)
                            )
                            Text(
                                text = "${String.format(Locale.US, "%.2f", progress)}%",
                                fontSize = 14.sp,
                                color = Color(0xFF34D399),
                                fontWeight = FontWeight.Black
                            )
                        }

                        // 3D Gradient Progress Bar Track & Fill
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(14.dp)
                                .clip(RoundedCornerShape(50))
                                .background(Color(0xFF050912))
                                .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(50))
                                .padding(2.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth(animatedProgress)
                                    .fillMaxHeight()
                                    .clip(RoundedCornerShape(50))
                                    .background(
                                        Brush.horizontalGradient(
                                            listOf(
                                                Color(0xFF059669),
                                                Color(0xFF10B981),
                                                Color(0xFF34D399),
                                                Color(0xFFFBBF24)
                                            )
                                        )
                                    )
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = Money.format(challenge.initialCapitalCents),
                                fontSize = 10.5.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF94A3B8)
                            )
                            Text(
                                text = Money.format(challenge.targetBalanceCents),
                                fontSize = 10.5.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF94A3B8)
                            )
                        }
                    }
                }
            }
        }

        // =====================================================================
        // 4 LUXURY STAT CARDS (بطاقات المعلومات)
        // =====================================================================
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            StatCard(
                title = "رأس المال الابتدائي",
                value = Money.format(challenge.initialCapitalCents),
                sub = "نقطة الانطلاق",
                icon = Icons.Default.AccountBalanceWallet,
                accentColor = Color(0xFFFBBF24),
                modifier = Modifier.weight(1f)
            )
            StatCard(
                title = "عدد الصفقات",
                value = "$completedTradesCount / 150",
                sub = "متبقي $remainingTrades",
                icon = Icons.Default.TrendingUp,
                accentColor = Color(0xFF34D399),
                modifier = Modifier.weight(1f)
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            StatCard(
                title = "الرصيد الحالي",
                value = Money.format(challenge.currentBalanceCents),
                sub = if (challenge.tradeCount == 0) "قبل البدء" else "رصيد الحساب",
                icon = Icons.Default.Layers,
                accentColor = Color(0xFFFBBF24),
                modifier = Modifier.weight(1f)
            )
            StatCard(
                title = "الهدف النهائي",
                value = Money.format(challenge.targetBalanceCents),
                sub = "خطة النهاية",
                icon = Icons.Default.Flag,
                accentColor = Color(0xFF34D399),
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        // =====================================================================
        // LUXURY GOLDEN ACTION BUTTONS (الأزرار)
        // =====================================================================
        if (!challenge.challengeStarted) {
            Surface(
                shape = RoundedCornerShape(18.dp),
                color = Color.Transparent,
                shadowElevation = 8.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(
                        Brush.horizontalGradient(
                            listOf(Color(0xFFF59E0B), Color(0xFFFBBF24), Color(0xFFD97706))
                        )
                    )
                    .clickable { onStartChallenge() }
            ) {
                Row(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Surface(color = Color(0xFF090E1A), shape = CircleShape, modifier = Modifier.size(32.dp)) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.RocketLaunch, contentDescription = null, tint = Color(0xFFFBBF24), modifier = Modifier.size(16.dp))
                            }
                        }
                        Text(
                            text = "بدء الرحلة برأس مال ${Money.format(challenge.initialCapitalCents)}",
                            color = Color(0xFF090E1A),
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp
                        )
                    }
                    Icon(Icons.Default.ChevronLeft, contentDescription = null, tint = Color(0xFF090E1A))
                }
            }
        } else {
            Surface(
                shape = RoundedCornerShape(18.dp),
                color = Color.Transparent,
                shadowElevation = 8.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(
                        Brush.horizontalGradient(
                            listOf(Color(0xFFF59E0B), Color(0xFFFBBF24), Color(0xFFD97706))
                        )
                    )
                    .clickable(enabled = completedTradesCount < 150) { onOpenAddTrade() }
            ) {
                Row(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Surface(color = Color(0xFF090E1A), shape = CircleShape, modifier = Modifier.size(32.dp)) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Add, contentDescription = null, tint = Color(0xFFFBBF24), modifier = Modifier.size(18.dp))
                            }
                        }
                        Text(
                            text = if (completedTradesCount < 150) {
                                "إضافة صفقة جديدة (الصفقة #${challenge.tradeCount + 1})"
                            } else {
                                "🎉 تم إكمال الـ 150 محطة"
                            },
                            color = Color(0xFF090E1A),
                            fontWeight = FontWeight.Black,
                            fontSize = 14.5.sp
                        )
                    }
                    Icon(Icons.Default.ChevronLeft, contentDescription = null, tint = Color(0xFF090E1A))
                }
            }

            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Color(0xFF101829),
                border = BorderStroke(1.dp, Color(0x55F59E0B)),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .clickable { onNewChallenge() }
            ) {
                Row(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 14.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.RocketLaunch, contentDescription = null, tint = Color(0xFFFBBF24), modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "ابدأ رحلة جديدة (تجديد 150 محطة تداول)",
                        color = Color(0xFFE2E8F0),
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            }
        }
    }
}

@Composable
fun StatCard(
    title: String,
    value: String,
    sub: String,
    icon: ImageVector = Icons.Default.Layers,
    accentColor: Color = AmberAccent,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0E1525)),
        shape = RoundedCornerShape(20.dp),
        border = BorderStroke(1.dp, accentColor.copy(alpha = 0.25f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(title, fontSize = 10.5.sp, color = Color(0xFF94A3B8), fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(value, fontSize = 16.sp, fontWeight = FontWeight.Black, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(sub, fontSize = 10.sp, color = Color(0xFF94A3B8), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Surface(
                    color = accentColor.copy(alpha = 0.12f),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, accentColor.copy(alpha = 0.35f)),
                    modifier = Modifier.size(36.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = accentColor,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
                Icon(
                    imageVector = Icons.Default.ChevronLeft,
                    contentDescription = null,
                    tint = Color(0xFF475569),
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}

@Composable
fun HistoryContent(
    trades: List<TradeEntity>,
    onSharePdf: () -> Unit,
    onSelectTrade: (TradeEntity) -> Unit,
    onOpenAddTrade: () -> Unit
) {
    var filter by remember { mutableStateOf("all") }

    var totalProfits = 0L
    var totalLosses = 0L
    var netResult = 0L
    trades.forEach { t ->
        if (t.resultCents > 0) totalProfits += t.resultCents
        else if (t.resultCents < 0) totalLosses += Math.abs(t.resultCents)
        netResult += t.resultCents
    }

    val filtered = trades.filter {
        when (filter) {
            "win" -> it.type == TradeType.WIN
            "loss" -> it.type == TradeType.LOSS
            "image" -> !it.attachmentPath.isNullOrBlank()
            else -> true
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("سجل الصفقات", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
            OutlinedButton(
                onClick = onSharePdf,
                colors = ButtonDefaults.outlinedButtonColors(contentColor = AmberAccent),
                border = androidx.compose.foundation.BorderStroke(1.dp, AmberAccent)
            ) {
                Text("مشاركة التقرير (PDF)", fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }

        // 4 Metric Boxes
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            Box(
                modifier = Modifier.weight(1f).background(CardBg, RoundedCornerShape(12.dp)).padding(8.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("صافي النتائج", fontSize = 9.sp, color = TextMuted)
                    Text(Money.format(netResult, true), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (netResult >= 0) ProfitGreen else LossRed)
                }
            }
            Box(
                modifier = Modifier.weight(1f).background(CardBg, RoundedCornerShape(12.dp)).padding(8.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("إجمالي الخسائر", fontSize = 9.sp, color = TextMuted)
                    Text(if (totalLosses > 0) "-${Money.format(totalLosses)}" else "$0.00", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = LossRed)
                }
            }
            Box(
                modifier = Modifier.weight(1f).background(CardBg, RoundedCornerShape(12.dp)).padding(8.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("إجمالي الأرباح", fontSize = 9.sp, color = TextMuted)
                    Text(Money.format(totalProfits, true), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = ProfitGreen)
                }
            }
            Box(
                modifier = Modifier.weight(1f).background(CardBg, RoundedCornerShape(12.dp)).padding(8.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("عدد الصفقات", fontSize = 9.sp, color = TextMuted)
                    Text("${trades.size}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }

        // Filter tabs
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
            FilterChipItem("الكل", filter == "all") { filter = "all" }
            FilterChipItem("الربح ↑", filter == "win") { filter = "win" }
            FilterChipItem("الخسارة ↓", filter == "loss") { filter = "loss" }
            FilterChipItem("مع صورة 📷", filter == "image") { filter = "image" }
        }

        if (filtered.isEmpty()) {
            Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("لا توجد صفقات حتى الآن", fontWeight = FontWeight.Bold, color = Color.White)
                    Text("ابدأ بإضافة أول صفقة لمتابعة تقدمك.", fontSize = 12.sp, color = TextMuted)
                    Button(
                        onClick = onOpenAddTrade,
                        colors = ButtonDefaults.buttonColors(containerColor = AmberAccent)
                    ) {
                        Text("إضافة صفقة", color = Color.Black, fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.weight(1f)) {
                items(filtered, key = { it.id }) { trade ->
                    val isWin = trade.type == TradeType.WIN
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable { onSelectTrade(trade) },
                        colors = CardDefaults.cardColors(containerColor = CardBg),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("#${trade.tradeNumber}", fontWeight = FontWeight.Bold, color = Color.White)
                                    Box(
                                        modifier = Modifier
                                            .background(if (isWin) Color(0x2210B981) else Color(0x22EF4444), RoundedCornerShape(6.dp))
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text(if (isWin) "✔ ربح" else "✕ خسارة", fontSize = 10.sp, color = if (isWin) ProfitGreen else LossRed, fontWeight = FontWeight.Bold)
                                    }
                                }
                                Text(Money.formatDateTime(trade.timestamp), fontSize = 10.sp, color = TextMuted)
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                if (!trade.attachmentPath.isNullOrBlank()) {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .border(1.dp, Color(0xFF334155), RoundedCornerShape(8.dp))
                                    ) {
                                        CloudAsyncImage(
                                            imageUrl = trade.attachmentPath,
                                            contentDescription = "مرفق",
                                            modifier = Modifier.fillMaxSize(),
                                            contentScale = ContentScale.Crop
                                        )
                                    }
                                }
                                Column {
                                    Text("نتيجة الصفقة", fontSize = 10.sp, color = TextMuted)
                                    Text(Money.format(trade.resultCents, true), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = if (isWin) ProfitGreen else LossRed)
                                }
                                Column {
                                    Text("الرصيد السابق", fontSize = 10.sp, color = TextMuted)
                                    Text(Money.format(trade.oldBalanceCents), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.LightGray)
                                }
                                Column {
                                    Text("الرصيد الجديد", fontSize = 10.sp, color = TextMuted)
                                    Text(Money.format(trade.newBalanceCents), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun RowScope.FilterChipItem(text: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .weight(1f)
            .background(if (selected) AmberAccent else Color(0xFF1E293B), RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (selected) Color.Black else TextMuted)
    }
}

@Composable
fun RoadmapContent(
    milestones: List<MilestoneEntity>,
    trades: List<TradeEntity>,
    onSelectMilestone: (MilestoneEntity) -> Unit
) {
    val completed = trades.count { it.type == TradeType.WIN }
    val failed = trades.count { it.type == TradeType.LOSS }
    val remaining = (150 - completed).coerceAtLeast(0)

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("خريطة المحطات", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Text("جدول المحطات التفاعلي (150 محطة)", fontSize = 12.sp, color = TextMuted)

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            Box(modifier = Modifier.weight(1f).background(CardBg, RoundedCornerShape(12.dp)).padding(10.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("المنجزة", fontSize = 11.sp, color = TextMuted)
                    Text("$completed", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = ProfitGreen)
                }
            }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .background(CardBg, RoundedCornerShape(12.dp))
                    .border(1.dp, LossRed.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                    .padding(10.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("الفاشلة", fontSize = 11.sp, color = LossRed)
                    Text("$failed", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = LossRed)
                }
            }
            Box(modifier = Modifier.weight(1f).background(CardBg, RoundedCornerShape(12.dp)).padding(10.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("المتبقية", fontSize = 11.sp, color = TextMuted)
                    Text("$remaining", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = AmberAccent)
                }
            }
            Box(modifier = Modifier.weight(1f).background(CardBg, RoundedCornerShape(12.dp)).padding(10.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("الإجمالي", fontSize = 11.sp, color = TextMuted)
                    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text("150", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            if (failed > 0) {
                                Text("+$failed", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = LossRed)
                            }
                        }
                    }
                }
            }
        }

        // Table Header
        Row(
            modifier = Modifier.fillMaxWidth().background(Color(0xFF1E293B), RoundedCornerShape(8.dp)).padding(vertical = 8.dp, horizontal = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("حالة الصفقة", fontSize = 11.sp, color = TextMuted, modifier = Modifier.weight(1f), textAlign = TextAlign.Center)
            Text("الربح", fontSize = 11.sp, color = TextMuted, modifier = Modifier.weight(1f), textAlign = TextAlign.Center)
            Text("رصيد الحساب", fontSize = 11.sp, color = TextMuted, modifier = Modifier.weight(1f), textAlign = TextAlign.Center)
            Text("المحطة", fontSize = 11.sp, color = TextMuted, modifier = Modifier.weight(1f), textAlign = TextAlign.Center)
        }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.weight(1f)) {
            items(milestones, key = { it.id }) { m ->
                val isWin = m.status == MilestoneStatus.WIN
                val isLoss = m.status == MilestoneStatus.LOSS
                val isPending = m.status == MilestoneStatus.PENDING

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(CardBg, RoundedCornerShape(8.dp))
                        .clickable { onSelectMilestone(m) }
                        .padding(vertical = 10.dp, horizontal = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                        when {
                            isWin -> Text("✔", color = ProfitGreen, fontWeight = FontWeight.Bold)
                            isLoss -> Text("✕", color = LossRed, fontWeight = FontWeight.Bold)
                            else -> Text("○", color = TextMuted)
                        }
                    }
                    Text(
                        Money.format(m.profitCents, true),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isWin) ProfitGreen else if (isLoss) LossRed else TextMuted,
                        modifier = Modifier.weight(1f),
                        textAlign = TextAlign.Center
                    )
                    Text(
                        Money.format(m.balanceCents),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isPending) TextMuted else Color.White,
                        modifier = Modifier.weight(1f),
                        textAlign = TextAlign.Center
                    )
                    Text(
                        "#${m.milestoneNumber}",
                        fontSize = 12.sp,
                        color = TextMuted,
                        modifier = Modifier.weight(1f),
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

@Composable
fun SettingsContent(
    challenge: ChallengeEntity,
    currentUser: AndroidAuthUser,
    onLogout: () -> Unit,
    onSave: (String, Long, Long) -> Unit,
    onResetClick: () -> Unit,
    onNewChallengeClick: () -> Unit,
    onAvatarUpdated: (String) -> Unit = {}
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var uploadingAvatar by remember { mutableStateOf(false) }

    val avatarLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            uploadingAvatar = true
            coroutineScope.launch {
                try {
                    val url = CommunityCloudManager.uploadUserAvatar(context, currentUser.id, uri)
                    onAvatarUpdated(url)
                    Toast.makeText(context, "تم تحديث صورتك الشخصية بنجاح", Toast.LENGTH_SHORT).show()
                } catch (_: Exception) {
                    Toast.makeText(context, "تعذر تحديث الصورة الشخصية", Toast.LENGTH_SHORT).show()
                } finally {
                    uploadingAvatar = false
                }
            }
        }
    }

    var nameInput by remember(challenge.userName) { mutableStateOf(challenge.userName) }
    var capitalInput by remember(challenge.initialCapitalCents) { mutableStateOf((challenge.initialCapitalCents / 100L).toString()) }
    var targetInput by remember(challenge.targetBalanceCents) { mutableStateOf((challenge.targetBalanceCents / 100L).toString()) }
    var savedAlert by remember { mutableStateOf(false) }
    var errorAlert by remember { mutableStateOf<String?>(null) }
    var showInstructions by remember { mutableStateOf(false) }

    if (showInstructions) {
        InstructionsContent(onBack = { showInstructions = false })
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("إعدادات الرحلة", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)

        // Active User, Circular Avatar Upload & Logout Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Box {
                        UserCircularAvatar(
                            avatarUrl = currentUser.avatarUrl,
                            displayName = currentUser.displayName,
                            userId = currentUser.id,
                            role = currentUser.role,
                            size = 48.dp,
                            onClick = { avatarLauncher.launch("image/*") }
                        )
                        if (uploadingAvatar) {
                            CircularProgressIndicator(
                                modifier = Modifier
                                    .size(14.dp)
                                    .align(Alignment.BottomEnd),
                                strokeWidth = 2.dp,
                                color = AmberAccent
                            )
                        }
                    }
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(currentUser.displayName, fontSize = 14.sp, fontWeight = FontWeight.Black, color = Color.White)
                            RoleBadgeChip(role = currentUser.role, senderId = currentUser.id)
                        }
                        Text(
                            "اضغط على الصورة لتغيير صورتك الشخصية",
                            fontSize = 11.sp,
                            color = AmberAccent
                        )
                    }
                }
                OutlinedButton(
                    onClick = onLogout,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = LossRed),
                    border = androidx.compose.foundation.BorderStroke(1.dp, LossRed.copy(alpha = 0.6f))
                ) {
                    Icon(Icons.Default.Logout, contentDescription = "تسجيل الخروج", modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("خروج", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("اسم المتداول", fontSize = 12.sp, color = TextMuted)
                OutlinedTextField(
                    value = nameInput,
                    onValueChange = { nameInput = it; savedAlert = false },
                    placeholder = { Text("مثال: Sami") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Text("رأس المال الابتدائي ($)", fontSize = 12.sp, color = TextMuted)
                OutlinedTextField(
                    value = capitalInput,
                    onValueChange = { capitalInput = it; savedAlert = false; errorAlert = null },
                    enabled = !challenge.challengeStarted,
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                if (!challenge.challengeStarted) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        listOf(50, 100, 250, 500, 1000, 5000).forEach { opt ->
                            Surface(
                                color = if (capitalInput == opt.toString()) AmberAccent else Color(0xFF1E293B),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { capitalInput = opt.toString() }
                            ) {
                                Text(
                                    text = "$$opt",
                                    color = if (capitalInput == opt.toString()) Color.Black else Color.LightGray,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 6.dp)
                                )
                            }
                        }
                    }
                }

                Text("الهدف النهائي ($)", fontSize = 12.sp, color = TextMuted)
                OutlinedTextField(
                    value = targetInput,
                    onValueChange = { targetInput = it; savedAlert = false; errorAlert = null },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                val currentErrorAlert = errorAlert
                if (currentErrorAlert != null) {
                    Text(currentErrorAlert, color = LossRed, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }

                Button(
                    onClick = {
                        val capRes = Money.parseCapitalToCents(capitalInput)
                        val tarRes = Money.parseCapitalToCents(targetInput)
                        if (capRes.isFailure) {
                            errorAlert = "يرجى إدخال رأس مال أكبر من صفر."
                            return@Button
                        }
                        if (tarRes.isFailure) {
                            errorAlert = "يرجى إدخال هدف أكبر من صفر."
                            return@Button
                        }
                        onSave(nameInput, capRes.getOrThrow(), tarRes.getOrThrow())
                        errorAlert = null
                        savedAlert = true
                    },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AmberAccent)
                ) {
                    Text("حفظ الإعدادات", color = Color.Black, fontWeight = FontWeight.Bold)
                }

                if (savedAlert) {
                    Text("تم حفظ الإعدادات بنجاح.", color = ProfitGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Text("دليل وقواعد الرحلة", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextMuted)

        Card(
            modifier = Modifier.fillMaxWidth().clickable { showInstructions = true },
            colors = CardDefaults.cardColors(containerColor = CardBg),
            border = androidx.compose.foundation.BorderStroke(1.dp, AmberAccent.copy(alpha = 0.45f)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("📖 التعليمات والإرشادات", fontWeight = FontWeight.Black, color = AmberAccent, fontSize = 15.sp)
                    Text("دليل وقواعد رحلة التداول الكامل وجدول استراتيجية النمو المتراكم (150 صفقة)", fontSize = 11.sp, color = TextMuted)
                }
                Icon(Icons.Default.MenuBook, contentDescription = null, tint = AmberAccent)
            }
        }

        Text("إدارة البيانات والرحلة", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextMuted)

        Card(
            modifier = Modifier.fillMaxWidth().clickable(onClick = onResetClick),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("إعادة الرحلة", fontWeight = FontWeight.Bold, color = LossRed)
                    Text("حذف سجل الصفقات وإعادة جميع المحطات إلى حالتها الأولية", fontSize = 11.sp, color = TextMuted)
                }
                Icon(Icons.Default.Refresh, contentDescription = null, tint = LossRed)
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth().clickable(onClick = onNewChallengeClick),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("ابدأ رحلة جديدة", fontWeight = FontWeight.Bold, color = AmberAccent)
                    Text("إنشاء رحلة جديدة برأس مال مختلف وإعادة ضبط الـ 150 محطة", fontSize = 11.sp, color = TextMuted)
                }
                Icon(Icons.Default.AddCircle, contentDescription = null, tint = AmberAccent)
            }
        }
    }
}

@Composable
fun InstructionsContent(onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Header Bar
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "التعليمات والإرشادات",
                fontSize = 18.sp,
                fontWeight = FontWeight.Black,
                color = Color.White
            )
            OutlinedButton(
                onClick = onBack,
                colors = ButtonDefaults.outlinedButtonColors(contentColor = AmberAccent),
                border = androidx.compose.foundation.BorderStroke(1.dp, AmberAccent.copy(alpha = 0.5f))
            ) {
                Text("رجوع", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }

        // Main Banner Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            border = androidx.compose.foundation.BorderStroke(1.dp, AmberAccent.copy(alpha = 0.4f)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    "📌 دليل وقواعد رحلة التداول (استراتيجية 150 صفقة)",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Black,
                    color = AmberAccent
                )
                Text(
                    "يرجى قراءة القواعد التالية بعناية والالتزام الكامل بها طوال مراحل الرحلة لضمان حماية الحساب والوصول إلى الهدف النهائي بنجاح.",
                    fontSize = 12.sp,
                    color = Color.LightGray
                )
            }
        }

        // Rule Card 1
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            border = androidx.compose.foundation.BorderStroke(1.dp, LossRed.copy(alpha = 0.4f)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "1️⃣ شبكة الأمان وحماية الحساب (هامش الخسارة):",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )
                Text(
                    "• عند بداية الرحلة، نعتبر مبلغ 50$ من رأس المال بمثابة حاجز أمان / خط أحمر.",
                    fontSize = 12.sp,
                    color = Color.LightGray
                )
                Text(
                    "• تنبيه مهم: إذا تعرض حساب أي مشترك لخسارة وصلت إلى 50$ في بداية الرحلة، يجب عليه إبلاغ قائد/منظم الرحلة فوراً لمراجعة الصفقات وإيقاف النزيف.",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = LossRed
                )
            }
        }

        // Rule Card 2
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            border = androidx.compose.foundation.BorderStroke(1.dp, AmberAccent.copy(alpha = 0.4f)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "2️⃣ مرحلة الأمان (تجاوز نقطة التعادل وسحب رأس المال):",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )
                Text(
                    "• المرحلة الذهبية: تكمن الخطوة الأهم والأصعب في الوصول بالحساب إلى ضعف رأس المال (300$)، أي تحقيق أرباح صافية تساوي 150$.",
                    fontSize = 12.sp,
                    color = AmberAccent
                )
                Text(
                    "• الخطوة التالية: بمجرد الوصول إلى هذا الهدف، يقوم جميع المشتركين بسحب مبلغ رأس المال الأساسي (150$) فوراً.",
                    fontSize = 12.sp,
                    color = Color.LightGray
                )
                Text(
                    "• النتيجة: نكتمل باقي رحلة الـ 150 صفقة باستخدام أرباح السوق فقط (150$)، مما يلغي أي مخاطرة على رأس مالك الشخصي.",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = ProfitGreen
                )
            }
        }

        // Rule Card 3
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF38BDF8).copy(alpha = 0.4f)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "3️⃣ آلية التعامل مع الصفقات الخاسرة (نظام الرجوع للخلف):",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )
                Text(
                    "الهدف هو إتمام 150 صفقة ناجحة. عند ضرب وقف الخسارة في أي صفقة، يتعامل الحساب مع الأمر بمرونة وفق القاعدة التالية:",
                    fontSize = 12.sp,
                    color = Color.LightGray
                )
                Text(
                    "• القاعدة: كل صفقة خاسرة تُرجعك خطوة واحدة إلى الخلف في الجدول.",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF38BDF8)
                )
                Text(
                    "• مثال توضيحي: إذا أتممت الصفقة رقم 25 بنجاح، ثم فتحت الصفقة رقم 26 وخسرت، يتم احتساب رصيدك الحالي وكأنك في الصفقة رقم 24. الصفقة القادمة التي ستدخلها ستكون لتعويض الخسارة والعودة إلى الصفقة رقم 25، وهكذا حتى نصل جميعاً إلى الصفقة 150 بنجاح.",
                    fontSize = 12.sp,
                    color = Color.LightGray
                )
            }
        }

        // Strategy Table Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    "جدول استراتيجية النمو المتراكم (150 صفقة)",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )

                Text("• رأس المال الابتدائي: $150", fontSize = 12.sp, color = AmberAccent, fontWeight = FontWeight.Bold)
                Text("• الربح الثابت لكل صفقة ادنى شيئ: $20", fontSize = 12.sp, color = ProfitGreen, fontWeight = FontWeight.Bold)
                Text("• إجمالي الأرباح المكتسبة: $3,000", fontSize = 12.sp, color = ProfitGreen, fontWeight = FontWeight.Bold)
                Text("• إجمالي رأس المال النهائي: $3,150", fontSize = 12.sp, color = AmberAccent, fontWeight = FontWeight.Bold)

                Spacer(modifier = Modifier.height(4.dp))

                // Table Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF1E293B), RoundedCornerShape(8.dp))
                        .padding(vertical = 8.dp, horizontal = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("رقم الصفقة", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted, modifier = Modifier.weight(0.8f), textAlign = TextAlign.Center)
                    Text("رأس المال قبل الصفقة ($)", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted, modifier = Modifier.weight(1.2f), textAlign = TextAlign.Center)
                    Text("الربح ($)", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted, modifier = Modifier.weight(0.8f), textAlign = TextAlign.Center)
                    Text("رأس المال بعد الربح ($)", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted, modifier = Modifier.weight(1.2f), textAlign = TextAlign.Center)
                }

                // 150 Rows
                for (i in 1..150) {
                    val beforeVal = 150 + (i - 1) * 20
                    val profitVal = 20
                    val afterVal = beforeVal + profitVal
                    val beforeStr = String.format(java.util.Locale.US, "%,d", beforeVal)
                    val afterStr = String.format(java.util.Locale.US, "%,d", afterVal)

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                if (i == 150) Color(0x33F59E0B)
                                else if (i % 2 == 0) Color(0xFF141B2A)
                                else Color(0xFF0E1420),
                                RoundedCornerShape(6.dp)
                            )
                            .padding(vertical = 7.dp, horizontal = 6.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("$i", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AmberAccent, modifier = Modifier.weight(0.8f), textAlign = TextAlign.Center)
                        Text(beforeStr, fontSize = 11.sp, color = Color.LightGray, modifier = Modifier.weight(1.2f), textAlign = TextAlign.Center)
                        Text("$profitVal", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = ProfitGreen, modifier = Modifier.weight(0.8f), textAlign = TextAlign.Center)
                        Text(afterStr, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.weight(1.2f), textAlign = TextAlign.Center)
                    }
                }

                // Footer Summary
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF1E293B), RoundedCornerShape(8.dp))
                        .padding(10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("إجمالي عدد الصفقات: 150 صفقة", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AmberAccent)
                    Text("رأس المال النهائي: 3,150$", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = ProfitGreen)
                }
            }
        }
    }
}
